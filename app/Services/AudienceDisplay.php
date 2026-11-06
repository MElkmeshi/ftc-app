<?php

namespace App\Services;

use App\Enums\DisplayMode;
use App\Events\AudienceDisplayChanged;
use App\Models\Award;
use App\Models\AwardWinner;
use App\Models\Setting;
use App\Models\Sponsor;
use App\Support\LiveBroadcast;

/**
 * The audience display's current screen for the current event. It is stored
 * on the server, not in a browser, so every display (and one that reloads or
 * joins late) shows the same thing.
 */
class AudienceDisplay
{
    private const GROUP = 'display';

    private const NAME = 'audience';

    public function __construct(private CurrentEvent $currentEvent) {}

    /**
     * The award, when one is being presented, carries only the places
     * revealed so far: displays are public pages, so a winner must not reach
     * them before it is announced.
     *
     * @return array{mode: string, match_id: int|null, message: string|null, changed_at: string|null, award: array{id: int, name: string, description: string|null, places: int, revealed: list<array{place: int, winners: list<array{team_number: string|null, team_name: string|null, recipient: string|null}>}>}|null, sponsors: list<array{id: int, name: string, level: string|null, logo_url: string|null}>|null}
     */
    public function state(): array
    {
        $stored = Setting::get(self::GROUP, self::NAME);
        $mode = DisplayMode::tryFrom($stored['mode'] ?? '') ?? DisplayMode::Blank;

        return [
            'mode' => $mode->value,
            'match_id' => $stored['match_id'] ?? null,
            'message' => $stored['message'] ?? null,
            'changed_at' => $stored['changed_at'] ?? null,
            'award' => $mode === DisplayMode::Award ? $this->presentedAward($stored['award_id'] ?? null, $stored['award_revealed'] ?? 0) : null,
            'sponsors' => $mode === DisplayMode::Sponsors ? $this->sponsors() : null,
        ];
    }

    /**
     * Shows an award with its last `$revealed` places announced, counting
     * from the lowest place up to the winner.
     */
    public function presentAward(Award $award, int $revealed): void
    {
        $current = Setting::get(self::GROUP, self::NAME) ?? [];

        $this->store([
            ...$current,
            'mode' => DisplayMode::Award->value,
            'award_id' => $award->id,
            'award_revealed' => max(0, min($revealed, $award->places)),
            'changed_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * @param  string|null  $message  The text for the message screen; the last one is kept so it can be shown again.
     */
    public function show(DisplayMode $mode, ?int $matchId = null, ?string $message = null): void
    {
        $stored = Setting::get(self::GROUP, self::NAME) ?? [];

        // Remember the match across screens like rankings or a message, so results can still be posted after.
        $this->store([
            ...$stored,
            'mode' => $mode->value,
            'match_id' => $matchId ?? $stored['match_id'] ?? null,
            'message' => $message ?? $stored['message'] ?? null,
            'changed_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $stored
     */
    private function store(array $stored): void
    {
        Setting::set(self::GROUP, self::NAME, $stored);

        LiveBroadcast::send(new AudienceDisplayChanged($this->currentEvent->require()->code, [
            'mode' => $stored['mode'],
            'match_id' => $stored['match_id'] ?? null,
            'message' => $stored['message'] ?? null,
            'changed_at' => $stored['changed_at'],
        ]));
    }

    /**
     * @return array{id: int, name: string, description: string|null, places: int, revealed: list<array{place: int, winners: list<array{team_number: string|null, team_name: string|null, recipient: string|null}>}>}|null
     */
    /**
     * @return list<array{id: int, name: string, level: string|null, logo_url: string|null}>
     */
    private function sponsors(): array
    {
        return Sponsor::query()->orderBy('position')->orderBy('id')->get()
            ->map(fn (Sponsor $sponsor): array => $sponsor->only(['id', 'name', 'level', 'logo_url']))
            ->all();
    }

    private function presentedAward(?int $awardId, int $revealed): ?array
    {
        $award = $awardId === null ? null : Award::query()->with('winners.team:id,number,name')->find($awardId);

        if ($award === null) {
            return null;
        }

        $revealedPlaces = array_slice(range($award->places, 1), 0, max(0, $revealed));

        return [
            'id' => $award->id,
            'name' => $award->name,
            'description' => $award->description,
            'places' => $award->places,
            'revealed' => array_map(fn (int $place): array => [
                'place' => $place,
                'winners' => $award->winners
                    ->where('place', $place)
                    ->map(fn (AwardWinner $winner): array => [
                        'team_number' => $winner->team?->number !== null ? (string) $winner->team->number : null,
                        'team_name' => $winner->team?->name,
                        'recipient' => $winner->recipient,
                    ])
                    ->values()
                    ->all(),
            ], $revealedPlaces),
        ];
    }
}
