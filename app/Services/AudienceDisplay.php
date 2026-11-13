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
     * @return array{mode: string, match_id: int|null, loaded_match_id: int|null, message: string|null, changed_at: string|null, award: array{id: int, name: string, description: string|null, is_team_award: bool, places: int, revealed: list<array{place: int, winners: list<array{team_number: string|null, team_name: string|null, team_location: string|null, recipient: string|null}>}>}|null, sponsors: list<array{id: int, name: string, level: string|null, logo_url: string|null}>|null}
     */
    public function state(): array
    {
        $stored = Setting::get(self::GROUP, self::NAME);
        $mode = DisplayMode::tryFrom($stored['mode'] ?? '') ?? DisplayMode::Blank;

        return [
            'mode' => $mode->value,
            'match_id' => $stored['match_id'] ?? null,
            'loaded_match_id' => $this->loadedMatchId(),
            'message' => $stored['message'] ?? null,
            'changed_at' => $stored['changed_at'] ?? null,
            'award' => $mode === DisplayMode::Award ? $this->presentedAward($stored['award_id'] ?? null, $stored['award_revealed'] ?? 0) : null,
            'sponsors' => $mode === DisplayMode::Sponsors ? $this->sponsors() : null,
        ];
    }

    public function loadedMatchId(): ?int
    {
        return cache()->get($this->loadedMatchKey());
    }

    /**
     * Readies a match for the field without changing what the audience sees,
     * like FTC Live's "Load Next Match".
     */
    public function load(int $matchId): void
    {
        cache()->put($this->loadedMatchKey(), $matchId, now()->addHours(12));

        $this->store(Setting::get(self::GROUP, self::NAME) ?? ['mode' => DisplayMode::Blank->value, 'changed_at' => now()->toIso8601String()]);
    }

    public function unload(): void
    {
        cache()->forget($this->loadedMatchKey());
    }

    private function loadedMatchKey(): string
    {
        return 'event.'.$this->currentEvent->require()->id.'.loaded_match_id';
    }

    /**
     * Shows an award with `$revealed` of its given slots announced,
     * counting from the last place up to the winner.
     */
    public function presentAward(Award $award, int $revealed): void
    {
        $current = Setting::get(self::GROUP, self::NAME) ?? [];

        $this->store([
            ...$current,
            'mode' => DisplayMode::Award->value,
            'award_id' => $award->id,
            'award_revealed' => max(0, min($revealed, $award->announcedWinners()->count())),
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
            'loaded_match_id' => $this->loadedMatchId(),
            'message' => $stored['message'] ?? null,
            'changed_at' => $stored['changed_at'] ?? null,
        ]));
    }

    /**
     * @return list<array{id: int, name: string, level: string|null, logo_url: string|null}>
     */
    private function sponsors(): array
    {
        return Sponsor::query()->orderBy('position')->orderBy('id')->get()
            ->map(fn (Sponsor $sponsor): array => $sponsor->only(['id', 'name', 'level', 'logo_url']))
            ->all();
    }

    /**
     * @return array{id: int, name: string, description: string|null, is_team_award: bool, places: int, revealed: list<array{place: int, winners: list<array{team_number: string|null, team_name: string|null, team_location: string|null, recipient: string|null}>}>}|null
     */
    private function presentedAward(?int $awardId, int $revealed): ?array
    {
        $award = $awardId === null ? null : Award::query()->with('winners.team:id,number,name,city')->find($awardId);

        if ($award === null) {
            return null;
        }

        return [
            'id' => $award->id,
            'name' => $award->name,
            'description' => $award->description,
            'is_team_award' => $award->is_team_award,
            'places' => $award->places,
            'revealed' => $award->announcedWinners()
                ->take(max(0, $revealed))
                ->map(fn (AwardWinner $winner): array => [
                    'place' => $winner->place,
                    'winners' => [[
                        'team_number' => $winner->team?->number !== null ? (string) $winner->team->number : null,
                        'team_name' => $winner->team?->name,
                        'team_location' => $winner->team?->city,
                        'recipient' => $winner->recipient,
                    ]],
                ])
                ->all(),
        ];
    }
}
