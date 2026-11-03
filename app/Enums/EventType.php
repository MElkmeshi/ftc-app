<?php

namespace App\Enums;

enum EventType: string
{
    case Scrimmage = 'scrimmage';
    case LeagueMeet = 'league_meet';
    case Qualifier = 'qualifier';
    case Championship = 'championship';
    case OffSeason = 'off_season';
    case Workshop = 'workshop';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Scrimmage => 'Scrimmage',
            self::LeagueMeet => 'League Meet',
            self::Qualifier => 'Qualifier',
            self::Championship => 'Championship',
            self::OffSeason => 'Off-Season',
            self::Workshop => 'Workshop / Practice',
            self::Other => 'Other',
        };
    }
}
