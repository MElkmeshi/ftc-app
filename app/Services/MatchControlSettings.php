<?php

namespace App\Services;

use App\Enums\MatchType;
use App\Models\Game;
use App\Models\Setting;

/**
 * The switches on Match Control's Settings tab, modelled on FTC Live's:
 * whether tablets score the match live, whether a match waits for every
 * team's pre-match setup, and which schedule "Load Next Match" follows.
 */
class MatchControlSettings
{
    private const GROUP = 'match_control';

    private const NAME = 'settings';

    private const RECORDED_COUNTDOWN_SECONDS = 3;

    private const DEFAULTS = [
        'live_scoring' => true,
        'require_ready' => false,
        'referee_tablets' => true,
        'flip_alliances' => false,
        'active_phase' => null,
        'hr_control' => 'none',
    ];

    public function __construct(private CurrentGame $currentGame, private MatchTimingService $matchTiming) {}

    /**
     * @return array{live_scoring: bool, require_ready: bool, referee_tablets: bool, flip_alliances: bool, active_phase: ?string, hr_control: string, recorded_countdown: bool, test_mode: bool}
     */
    public function all(): array
    {
        $stored = array_intersect_key((array) Setting::get(self::GROUP, self::NAME, []), self::DEFAULTS);

        return [
            ...self::DEFAULTS,
            ...$stored,
            'recorded_countdown' => $this->matchTiming->current()['pre_match_countdown'] > 0,
            'test_mode' => (bool) Setting::get(self::GROUP, 'test_mode', false),
        ];
    }

    /**
     * @param  array<string, mixed>  $changes
     * @return array{live_scoring: bool, require_ready: bool, referee_tablets: bool, flip_alliances: bool, active_phase: ?string, hr_control: string, recorded_countdown: bool, test_mode: bool}
     */
    public function update(array $changes): array
    {
        $current = $this->all();

        Setting::set(self::GROUP, self::NAME, array_intersect_key([...$current, ...$changes], self::DEFAULTS));

        if (array_key_exists('recorded_countdown', $changes) && (bool) $changes['recorded_countdown'] !== $current['recorded_countdown']) {
            $this->setRecordedCountdown((bool) $changes['recorded_countdown']);
        }

        return $this->all();
    }

    public function waitsForTablets(): bool
    {
        return $this->all()['live_scoring'];
    }

    public function waitsForRefereeTablets(): bool
    {
        return $this->all()['referee_tablets'];
    }

    public function requiresReadyTeams(): bool
    {
        return $this->all()['require_ready'];
    }

    public function activePhase(): ?MatchType
    {
        return MatchType::tryFrom((string) $this->all()['active_phase']);
    }

    private function setRecordedCountdown(bool $enabled): void
    {
        $game = $this->currentGame->require();
        $timing = array_intersect_key($this->matchTiming->current(), array_flip(Game::TIMING_KEYS));
        $timing['pre_match_countdown'] = $enabled ? self::RECORDED_COUNTDOWN_SECONDS : 0;

        $game->update(['timing' => $timing]);
    }
}
