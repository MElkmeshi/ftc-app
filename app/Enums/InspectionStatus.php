<?php

namespace App\Enums;

/**
 * Where a team's robot is in inspection, as on FTC Live's inspection pages.
 */
enum InspectionStatus: string
{
    case NotStarted = 'not_started';
    case InProgress = 'in_progress';
    case Incomplete = 'incomplete';
    case Passed = 'passed';

    public function label(): string
    {
        return match ($this) {
            self::NotStarted => 'Not started',
            self::InProgress => 'In progress',
            self::Incomplete => 'Incomplete',
            self::Passed => 'Passed',
        };
    }
}
