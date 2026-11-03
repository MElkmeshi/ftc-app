<?php

namespace App\Services;

use App\Enums\MatchStatus;
use App\Models\CompetitionMatch;

/**
 * Spreads matches over the event's fields the way FTC Live does: match 1 on
 * field 1, match 2 on field 2, and so on, wrapping around. Played matches
 * keep the field they were played on.
 */
class FieldAssignment
{
    public function __construct(private CurrentEvent $currentEvent) {}

    public function fieldCount(): int
    {
        return max(1, (int) $this->currentEvent->require()->field_count);
    }

    public function fieldFor(int $matchNumber): int
    {
        return (($matchNumber - 1) % $this->fieldCount()) + 1;
    }

    /**
     * Re-spread the matches that haven't been played, e.g. after the number of fields changes.
     */
    public function reassignUpcoming(): void
    {
        CompetitionMatch::query()
            ->where('status', MatchStatus::UPCOMING)
            ->get(['id', 'number', 'field'])
            ->each(function (CompetitionMatch $match): void {
                $field = $this->fieldFor($match->number);

                if ($match->field !== $field) {
                    $match->update(['field' => $field]);
                }
            });
    }
}
