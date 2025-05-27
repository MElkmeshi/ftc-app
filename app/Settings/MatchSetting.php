<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class MatchSetting extends Settings
{
    public int $match_duration_seconds;

    public static function group(): string
    {
        return 'match';
    }
}
