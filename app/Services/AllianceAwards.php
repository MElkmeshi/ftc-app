<?php

namespace App\Services;

use App\Enums\AwardKind;
use App\Enums\EliminationRound;
use App\Models\AllianceGroup;
use App\Models\Award;
use App\Models\AwardWinner;
use App\Models\EliminationSeries;

/**
 * Fills in the Winning Alliance and Finalist Alliance awards from the
 * playoff bracket, like FTC Live does: once the final has a winner, each
 * award lists that alliance's teams, captain first. They are emptied again
 * when the final is reopened or the bracket is reset.
 */
class AllianceAwards
{
    public function sync(): void
    {
        $final = EliminationSeries::query()
            ->where('round', EliminationRound::FINAL->value)
            ->whereNotNull('winner_alliance_group_id')
            ->first();

        $winnerId = $final?->winner_alliance_group_id;
        $finalistId = $final === null ? null : ($winnerId === $final->alliance_group_1_id ? $final->alliance_group_2_id : $final->alliance_group_1_id);

        $this->give(AwardKind::FinalistAlliance, $finalistId === null ? null : AllianceGroup::find($finalistId));
        $this->give(AwardKind::WinningAlliance, $winnerId === null ? null : AllianceGroup::find($winnerId));
    }

    private function give(AwardKind $kind, ?AllianceGroup $alliance): void
    {
        $award = Award::query()->where('kind', $kind->value)->first();

        if ($alliance === null) {
            $award?->winners()->delete();

            return;
        }

        $award ??= $this->create($kind);
        $award->update(['places' => count($alliance->memberIds())]);
        $award->winners()->delete();

        foreach ($alliance->memberIds() as $index => $teamId) {
            AwardWinner::create(['award_id' => $award->id, 'place' => $index + 1, 'team_id' => $teamId]);
        }
    }

    private function create(AwardKind $kind): Award
    {
        $existing = Award::query()
            ->whereNull('kind')
            ->whereIn('name', [$kind->defaultName(), str($kind->defaultName())->beforeLast(' Award')->toString()])
            ->first();

        if ($existing !== null) {
            $existing->update(['kind' => $kind->value, 'is_team_award' => true]);

            return $existing;
        }

        return Award::create([
            'name' => $kind->defaultName(),
            'is_team_award' => true,
            'kind' => $kind->value,
            'places' => 1,
            'display_order' => (Award::query()->max('display_order') ?? 0) + 1,
        ]);
    }
}
