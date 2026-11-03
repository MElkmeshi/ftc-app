<?php

namespace App\Services;

use App\Enums\EventType;
use App\Models\Event;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Throwable;

/**
 * Exports an event as one self-contained file and imports it again, on this
 * server or another one. This is our version of FTC Live's event archive:
 * the file carries the event's game, teams, schedule, scores and playoffs.
 *
 * Row ids are internal, so on import every foreign key is remapped onto the
 * newly inserted rows. Red/blue alliances are global and matched by colour,
 * and authorship columns point at the importing user.
 */
class EventArchive
{
    public const FORMAT = 'ftc-app.event';

    public const VERSION = 1;

    /**
     * Event-owned tables in insertion order, with the event-owned table each
     * foreign key column points at.
     *
     * @var array<string, array<string, string>>
     */
    private const TABLES = [
        'groups' => [],
        'score_types' => ['group_id' => 'groups'],
        'teams' => [],
        'alliance_groups' => ['captain_team_id' => 'teams', 'picked_team_id' => 'teams', 'pending_team_id' => 'teams'],
        'elimination_series' => ['alliance_group_1_id' => 'alliance_groups', 'alliance_group_2_id' => 'alliance_groups', 'winner_alliance_group_id' => 'alliance_groups'],
        'matches' => ['elimination_series_id' => 'elimination_series'],
        'match_alliances' => ['match_id' => 'matches', 'team_id' => 'teams', 'alliance_group_id' => 'alliance_groups'],
        'scores' => ['match_id' => 'matches', 'team_id' => 'teams', 'score_type_id' => 'score_types'],
        'alliance_selection_declines' => ['team_id' => 'teams', 'alliance_group_id' => 'alliance_groups'],
        'settings' => [],
    ];

    private const AUTHOR_COLUMNS = ['created_by', 'updated_by'];

    /**
     * Server-specific columns that would clash if the file is imported on the same server.
     */
    private const DROPPED_COLUMNS = ['client_request_id'];

    /**
     * Settings that describe this server's live state (what the audience
     * display shows), not the event itself.
     */
    private const SERVER_SETTING_GROUPS = ['display'];

    private const EVENT_COLUMNS = ['name', 'type', 'venue', 'timezone', 'start_date', 'end_date', 'field_count'];

    /**
     * @return array{format: string, version: int, exported_at: string, event: array<string, mixed>, alliances: array<int, string>, tables: array<string, list<array<string, mixed>>>}
     */
    public function export(Event $event): array
    {
        $tables = [];

        foreach (array_keys(self::TABLES) as $table) {
            $tables[$table] = DB::table($table)
                ->where('event_id', $event->id)
                ->when($table === 'settings', fn ($query) => $query->whereNotIn('group', self::SERVER_SETTING_GROUPS))
                ->orderBy('id')
                ->get()
                ->map(fn (object $row): array => collect((array) $row)->except(['event_id', ...self::AUTHOR_COLUMNS, ...self::DROPPED_COLUMNS])->all())
                ->all();
        }

        return [
            'format' => self::FORMAT,
            'version' => self::VERSION,
            'exported_at' => now()->toIso8601String(),
            'event' => ['code' => $event->code, ...$event->only(self::EVENT_COLUMNS), 'type' => $event->type->value, 'start_date' => $event->start_date?->toDateString(), 'end_date' => $event->end_date?->toDateString()],
            'alliances' => DB::table('alliances')->pluck('color', 'id')->all(),
            'tables' => $tables,
        ];
    }

    /**
     * @param  array<string, mixed>  $archive
     */
    public function import(array $archive, string $code, int $importedBy): Event
    {
        if (($archive['format'] ?? null) !== self::FORMAT || ! is_array($archive['tables'] ?? null) || ! is_array($archive['event'] ?? null)) {
            throw new InvalidArgumentException('This is not an event file exported from this app.');
        }

        if (($archive['version'] ?? 0) > self::VERSION) {
            throw new InvalidArgumentException('This event file was made by a newer version of the app.');
        }

        $eventAttributes = $this->eventAttributes($archive['event']);

        return DB::transaction(function () use ($archive, $code, $importedBy, $eventAttributes): Event {
            $event = Event::query()->create([
                ...$eventAttributes,
                'code' => $code,
                'created_by' => $importedBy,
            ]);

            $allianceIds = $this->allianceIdMap($archive['alliances'] ?? []);
            $idMaps = [];

            foreach (self::TABLES as $table => $foreignKeys) {
                $idMaps[$table] = [];
                $columns = array_flip(Schema::getColumnListing($table));

                foreach ($archive['tables'][$table] ?? [] as $row) {
                    if (! is_array($row)) {
                        throw new InvalidArgumentException("The event file is inconsistent: {$table} has a malformed row.");
                    }

                    if ($table === 'settings' && in_array($row['group'] ?? null, self::SERVER_SETTING_GROUPS, true)) {
                        continue;
                    }

                    $oldId = $row['id'] ?? null;
                    $row = array_diff_key(array_intersect_key((array) $row, $columns), array_flip(['id', ...self::DROPPED_COLUMNS]));

                    foreach ($foreignKeys as $column => $referencedTable) {
                        if (isset($row[$column])) {
                            $row[$column] = $idMaps[$referencedTable][$row[$column]]
                                ?? throw new InvalidArgumentException("The event file is inconsistent: {$table}.{$column} points at a missing row.");
                        }
                    }

                    if (isset($row['alliance_id'])) {
                        $row['alliance_id'] = $allianceIds[$row['alliance_id']]
                            ?? throw new InvalidArgumentException("The event file is inconsistent: {$table}.alliance_id points at an unknown alliance.");
                    }

                    foreach (self::AUTHOR_COLUMNS as $column) {
                        if (isset($columns[$column])) {
                            $row[$column] = $importedBy;
                        }
                    }

                    if (isset($row['payload']) && is_array($row['payload'])) {
                        $row['payload'] = json_encode($row['payload']);
                    }

                    $newId = DB::table($table)->insertGetId([...$row, 'event_id' => $event->id]);

                    if ($oldId !== null) {
                        $idMaps[$table][$oldId] = $newId;
                    }
                }
            }

            return $event;
        });
    }

    /**
     * Maps the archive's alliance ids onto this server's, matching by colour.
     * Alliances are shared by every event, so an import may only use colours
     * this server already has; it never adds new ones.
     *
     * @param  array<int|string, mixed>  $archivedAlliances
     * @return array<int|string, int>
     */
    private function allianceIdMap(array $archivedAlliances): array
    {
        $localIds = DB::table('alliances')->pluck('id', 'color');

        return collect($archivedAlliances)
            ->map(fn (mixed $color): int => is_string($color) && isset($localIds[$color])
                ? $localIds[$color]
                : throw new InvalidArgumentException('The event file uses an alliance this server does not have.'))
            ->all();
    }

    /**
     * The archived event's details, checked the same way as when an event is
     * created by hand. Unknown or broken values fall back to safe defaults.
     *
     * @param  array<string, mixed>  $archived
     * @return array<string, mixed>
     */
    private function eventAttributes(array $archived): array
    {
        $date = function (mixed $value): ?string {
            try {
                return is_string($value) ? CarbonImmutable::parse($value)->toDateString() : null;
            } catch (Throwable) {
                return null;
            }
        };

        $startDate = $date($archived['start_date'] ?? null) ?? now()->toDateString();
        $endDate = $date($archived['end_date'] ?? null) ?? $startDate;
        $timezone = $archived['timezone'] ?? null;

        return [
            'name' => Str::limit(is_string($archived['name'] ?? null) && $archived['name'] !== '' ? $archived['name'] : 'Imported event', 255, ''),
            'type' => EventType::tryFrom((string) ($archived['type'] ?? ''))?->value ?? EventType::Other->value,
            'venue' => is_string($archived['venue'] ?? null) ? Str::limit($archived['venue'], 255, '') : null,
            'timezone' => is_string($timezone) && in_array($timezone, timezone_identifiers_list(), true) ? $timezone : config('app.timezone'),
            'start_date' => $startDate,
            'end_date' => $endDate < $startDate ? $startDate : $endDate,
            'field_count' => max(1, min(8, (int) ($archived['field_count'] ?? 1))),
        ];
    }
}
