<?php

namespace App\Services;

use App\Models\Game;

class MatchTimingService
{
    public function __construct(private CurrentGame $currentGame) {}

    /**
     * Current match timing configuration, in seconds, from the current game
     * (falling back to config/competition.php defaults for anything it leaves out).
     *
     * @return array{pre_match_countdown: int, autonomous: int, transition: int, teleop: int, endgame_warning: int, controllers_warning_offset: int, total_match: int, total_with_countdown: int}
     */
    public function current(): array
    {
        $overrides = $this->currentGame->get()?->timing ?? [];
        $timing = [];

        foreach (Game::TIMING_KEYS as $key) {
            $timing[$key] = (int) ($overrides[$key] ?? config("competition.timing.{$key}", 0));
        }

        $timing['total_match'] = $timing['autonomous'] + $timing['transition'] + $timing['teleop'];
        $timing['total_with_countdown'] = $timing['total_match'] + $timing['pre_match_countdown'];

        return $timing;
    }

    /**
     * The full match duration (pre-match countdown through endgame), in milliseconds,
     * as a fixed snapshot to attach to a match when it starts.
     */
    public function currentDurationMs(): int
    {
        return $this->current()['total_with_countdown'] * 1000;
    }
}
