<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Match Timing Configuration (Fallback Defaults)
    |--------------------------------------------------------------------------
    |
    | These are FALLBACK defaults only, used if database settings don't exist.
    | Actual timing is stored in the database (settings table, group='competition')
    | and can be configured via /admin/competition-settings
    |
    | All values are in seconds.
    |
    | Default values below are FTC standard format as reference:
    | - Pre-Match Countdown: 3 seconds
    | - Autonomous: 30 seconds
    | - Transition: 8 seconds (FTC standard, but you may use 20s)
    | - Teleop: 120 seconds (2 minutes)
    | - Endgame Warning: 20 seconds (FTC standard, but you may use 30s)
    |
    */

    'timing' => [
        // Pre-match countdown before match starts (3-2-1)
        'pre_match_countdown' => (int) env('MATCH_PRE_COUNTDOWN', 3),

        // Autonomous period duration
        'autonomous' => (int) env('MATCH_AUTONOMOUS_DURATION', 30),

        // Transition period (hand off controllers)
        'transition' => (int) env('MATCH_TRANSITION_DURATION', 20),

        // Teleop period duration
        'teleop' => (int) env('MATCH_TELEOP_DURATION', 120),

        // Endgame warning time (how many seconds before match end to warn)
        'endgame_warning' => (int) env('MATCH_ENDGAME_WARNING', 30),

        // Not used anymore - kept for compatibility
        'controllers_warning_offset' => (int) env('MATCH_CONTROLLERS_WARNING_OFFSET', 0),
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
