<?php

namespace App\Services;

use App\Enums\EventType;
use App\Enums\RankingMethod;
use App\Models\Event;
use App\Models\Game;
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
 * Importing always creates a new game holding the archived one, so editing
 * it can never change another event.
 *
 * Row ids are internal, so on import every foreign key is remapped onto the
 * newly inserted rows. Red/blue alliances are global and matched by colour,
 * and authorship columns point at the importing user.
 */
class EventArchive
{
    public const FORMAT = 'ftc-app.event';

    /** Version 2 moved the game (score types, timing, ranking) out of the event's settings into its own block. */
    public const VERSION = 2;

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
        'inspections' => ['team_id' => 'teams'],
        'awards' => [],
        'award_winners' => ['award_id' => 'awards', 'team_id' => 'teams'],
        'alliance_groups' => ['captain_team_id' => 'teams', 'picked_team_id' => 'teams', 'pending_team_id' => 'teams'],
        'elimination_series' => ['alliance_group_1_id' => 'alliance_groups', 'alliance_group_2_id' => 'alliance_groups', 'winner_alliance_group_id' => 'alliance_groups'],
        'matches' => ['elimination_series_id' => 'elimination_series'],
        'match_alliances' => ['match_id' => 'matches', 'team_id' => 'teams', 'alliance_group_id' => 'alliance_groups'],
        'scores' => ['match_id' => 'matches', 'team_id' => 'teams', 'score_type_id' => 'score_types'],
        'match_notes' => ['match_id' => 'matches'],
        'alliance_selection_declines' => ['team_id' => 'teams', 'alliance_group_id' => 'alliance_groups'],
        'settings' => [],
    ];

    /** Tables owned by the event's game rather than by the event. */
    private const GAME_TABLES = ['groups', 'score_types'];

    /** Version 1 kept the game's timing and ranking method in these setting groups. */
    private const LEGACY_GAME_SETTING_GROUPS = ['competition', 'ranking'];

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
     * @return array{format: string, version: int, exported_at: string, event: array<string, mixed>, game: array<string, mixed>, alliances: array<int, string>, tables: array<string, list<array<string, mixed>>>}
     */
    public function export(Event $event): array
    {
        return DB::transaction(fn (): array => $this->exportSnapshot($event));
    }

    /**
     * Reads every table inside one transaction, so the archive is a single
     * consistent snapshot: a score saved mid-export cannot appear in the score
     * rows while missing from the totals read just before.
     *
     * @return array{format: string, version: int, exported_at: string, event: array<string, mixed>, game: array<string, mixed>, alliances: array<int, string>, tables: array<string, list<array<string, mixed>>>}
     */
    private function exportSnapshot(Event $event): array
    {
        $tables = [];
        $game = $event->game;

        foreach (array_keys(self::TABLES) as $table) {
            $tables[$table] = DB::table($table)
                ->when(
                    in_array($table, self::GAME_TABLES, true),
                    fn ($query) => $query->where('game_id', $event->game_id),
                    fn ($query) => $query->where('event_id', $event->id),
                )
                ->when($table === 'settings', fn ($query) => $query->whereNotIn('group', self::SERVER_SETTING_GROUPS))
                ->orderBy('id')
                ->get()
                ->map(fn (object $row): array => collect((array) $row)->except(['event_id', 'game_id', ...self::AUTHOR_COLUMNS, ...self::DROPPED_COLUMNS])->all())
                ->all();
        }

        return [
            'format' => self::FORMAT,
            'version' => self::VERSION,
            'exported_at' => now()->toIso8601String(),
            'event' => ['code' => $event->code, ...$event->only(self::EVENT_COLUMNS), 'type' => $event->type->value, 'start_date' => $event->start_date?->toDateString(), 'end_date' => $event->end_date?->toDateString()],
            'game' => [
                'name' => $game?->name,
                'description' => $game?->description,
                'timing' => $game?->timing,
                'ranking_method' => $game?->ranking_method->value,
            ],
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
            $game = Game::query()->create([
                ...$this->gameAttributes($archive, $eventAttributes['name']),
                'created_by' => $importedBy,
            ]);

            $event = Event::query()->create([
                ...$eventAttributes,
                'game_id' => $game->id,
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

                    if ($table === 'settings' && in_array($row['group'] ?? null, [...self::SERVER_SETTING_GROUPS, ...self::LEGACY_GAME_SETTING_GROUPS], true)) {
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

                    $owner = in_array($table, self::GAME_TABLES, true) ? ['game_id' => $game->id] : ['event_id' => $event->id];
                    $newId = DB::table($table)->insertGetId([...$row, ...$owner]);

                    if ($oldId !== null) {
                        $idMaps[$table][$oldId] = $newId;
                    }
                }
            }

            return $event;
        });
    }

    /**
     * The archived game, checked like the Games page checks it. Version 1
     * files kept timing and ranking in the event's settings instead.
     *
     * @param  array<string, mixed>  $archive
     * @return array{name: string, description: ?string, timing: ?array<string, int>, ranking_method: string}
     */
    private function gameAttributes(array $archive, string $eventName): array
    {
        $archived = is_array($archive['game'] ?? null) ? $archive['game'] : [];
        $timing = $archived['timing'] ?? null;
        $rankingMethod = $archived['ranking_method'] ?? null;

        if (($archive['version'] ?? 1) < 2) {
            $settings = collect($archive['tables']['settings'] ?? [])
                ->filter(fn (mixed $row): bool => is_array($row))
                ->map(fn (array $row): array => [...$row, 'payload' => is_string($row['payload'] ?? null) ? json_decode($row['payload'], true) : ($row['payload'] ?? null)]);
            $timing = $settings->where('group', 'competition')->pluck('payload', 'name')->all();
            $rankingMethod = $settings->where('group', 'ranking')->firstWhere('name', 'method')['payload'] ?? null;
        }

        $timing = collect(is_array($timing) ? $timing : [])
            ->only(Game::TIMING_KEYS)
            ->filter(fn (mixed $seconds): bool => is_numeric($seconds))
            ->map(fn (mixed $seconds): int => max(0, min(600, (int) $seconds)))
            ->all();

        return [
            'name' => Str::limit(is_string($archived['name'] ?? null) && $archived['name'] !== '' ? $archived['name'] : $eventName.' game', 255, ''),
            'description' => is_string($archived['description'] ?? null) ? Str::limit($archived['description'], 2000, '') : null,
            'timing' => $timing === [] ? null : $timing,
            'ranking_method' => RankingMethod::tryFrom((string) $rankingMethod)?->value ?? RankingMethod::TotalScore->value,
        ];
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
