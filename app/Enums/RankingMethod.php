<?php

namespace App\Enums;

use App\Models\Setting;

/**
 * How qualification rankings are ordered.
 */
enum RankingMethod: string
{
    /** Sum of every point a team earned across its matches (the original behaviour). */
    case TotalScore = 'total_score';

    /** FTC style: ranking points (2 per win, 1 per tie) averaged per match, then average alliance score. */
    case Record = 'record';

    public function label(): string
    {
        return match ($this) {
            self::TotalScore => 'Total points scored',
            self::Record => 'Win/loss record (FTC style)',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::TotalScore => 'Teams are ranked by the total points they earned in all qualification matches.',
            self::Record => 'A win is worth 2 ranking points and a tie 1, averaged over matches played. Ties are broken by average alliance score, then highest match score.',
        };
    }

    public static function current(): self
    {
        return self::tryFrom((string) Setting::get('ranking', 'method', self::TotalScore->value)) ?? self::TotalScore;
    }
}
