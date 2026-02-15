<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Match Timing Configuration
    |--------------------------------------------------------------------------
    |
    | These values control the duration of each phase of a match.
    | All values are in seconds.
    |
    | FTC Standard Match Format:
    | - Pre-Match Countdown: 3 seconds
    | - Autonomous: 30 seconds
    | - Transition: 8 seconds
    | - Teleop: 120 seconds (2 minutes)
    | - Total Match: 158 seconds (2 minutes 38 seconds)
    |
    */

    'timing' => [
        // Pre-match countdown before match starts (3-2-1)
        'pre_match_countdown' => (int) env('MATCH_PRE_COUNTDOWN', 3),

        // Autonomous period duration
        'autonomous' => (int) env('MATCH_AUTONOMOUS_DURATION', 30),

        // Transition period (hand off controllers)
        'transition' => (int) env('MATCH_TRANSITION_DURATION', 8),

        // Teleop period duration
        'teleop' => (int) env('MATCH_TELEOP_DURATION', 120),

        // Endgame warning time (how many seconds before match end to warn)
        'endgame_warning' => (int) env('MATCH_ENDGAME_WARNING', 20),

        // Controllers pickup warning offset (seconds before teleop starts)
        'controllers_warning_offset' => (int) env('MATCH_CONTROLLERS_WARNING_OFFSET', 2),
    ],

    /*
    |--------------------------------------------------------------------------
    | Sound Timing Configuration
    |--------------------------------------------------------------------------
    |
    | These values define when sounds should be played during a match.
    | Times are specified as offsets or specific phase transitions.
    |
    */

    'sounds' => [
        // Enable/disable match sounds globally
        'enabled' => (bool) env('MATCH_SOUNDS_ENABLED', true),

        // Sound file mappings (FTC Live standard sounds)
        'files' => [
            'countdown' => 'countdown.wav',              // 3-2-1 countdown (FTC Live)
            'match_start' => 'match_start_whistle.wav',  // Match start whistle (FTC Live charge.wav)
            'auto_end' => 'auto_end_ftc.wav',            // End of autonomous (FTC Live endauto.wav)
            'controllers' => 'controllers_pickup.wav',   // Pick up controllers (FTC Live)
            'start_teleop' => 'start_teleop.wav',        // Start of teleop (not used in FTC)
            'endgame_warning' => 'endgame_whistle.wav',  // Endgame warning (FTC Live factwhistle.wav)
            'match_end' => 'end_match.wav',              // Match end
            'abort_match' => 'canel_match.wav',          // Match cancelled/aborted
        ],
    ],
];
