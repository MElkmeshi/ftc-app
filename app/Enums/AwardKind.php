<?php

namespace App\Enums;

/**
 * Awards the event fills in by itself from the playoff bracket, like FTC
 * Live's Winning Alliance and Finalist Alliance awards.
 */
enum AwardKind: string
{
    case WinningAlliance = 'winning_alliance';
    case FinalistAlliance = 'finalist_alliance';

    public function defaultName(): string
    {
        return match ($this) {
            self::WinningAlliance => 'Winning Alliance Award',
            self::FinalistAlliance => 'Finalist Alliance Award',
        };
    }
}
