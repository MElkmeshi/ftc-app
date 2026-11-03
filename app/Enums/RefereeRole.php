<?php

namespace App\Enums;

/**
 * The two referees per alliance, like FTC Live: one scores what the robots
 * do, the other calls the fouls that alliance's robots commit.
 */
enum RefereeRole: string
{
    case SCORING = 'scoring';
    case PENALTY = 'penalty';

    public function label(): string
    {
        return match ($this) {
            self::SCORING => 'scoring',
            self::PENALTY => 'penalties',
        };
    }
}
