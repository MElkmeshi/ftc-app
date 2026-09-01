<?php

namespace App\Services;

use App\Models\Setting;

class MatchTimingService
{
    /**
     * Current match timing configuration, in seconds, from settings
     * (falling back to config/competition.php defaults).
     *
     * @return array{pre_match_countdown: int, autonomous: int, transition: int, teleop: int, endgame_warning: int, controllers_warning_offset: int, total_match: int, total_with_countdown: int}
     */
    public function current(): array
    {
        try {
            $timing = [
                'pre_match_countdown' => (int) Setting::get('competition', 'pre_match_countdown', config('competition.timing.pre_match_countdown')),
                'autonomous' => (int) Setting::get('competition', 'autonomous', config('competition.timing.autonomous')),
                'transition' => (int) Setting::get('competition', 'transition', config('competition.timing.transition')),
                'teleop' => (int) Setting::get('competition', 'teleop', config('competition.timing.teleop')),
                'endgame_warning' => (int) Setting::get('competition', 'endgame_warning', config('competition.timing.endgame_warning')),
                'controllers_warning_offset' => (int) Setting::get('competition', 'controllers_warning_offset', config('competition.timing.controllers_warning_offset')),
            ];
        } catch (\Throwable) {
            $timing = config('competition.timing', []);
        }

        $timing['total_match'] = ($timing['autonomous'] ?? 0) + ($timing['transition'] ?? 0) + ($timing['teleop'] ?? 0);
        $timing['total_with_countdown'] = $timing['total_match'] + ($timing['pre_match_countdown'] ?? 0);

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
