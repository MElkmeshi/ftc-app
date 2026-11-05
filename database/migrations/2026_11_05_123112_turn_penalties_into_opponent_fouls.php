<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Penalties that took points from the fouling alliance become fouls whose
     * points go to its opponent, and the fouls already scored move with them,
     * so no score type takes points away any more.
     */
    public function up(): void
    {
        $penaltyIds = DB::table('score_types')
            ->where('points', '<', 0)
            ->orWhere(fn ($query) => $query->where('referee', 'penalty')->where(fn ($query) => $query->where('awarded_to', 'own')->orWhere('target', 'team')))
            ->pluck('id');

        DB::transaction(function () use ($penaltyIds): void {
            DB::table('scores')->whereIn('score_type_id', $penaltyIds)->orderBy('id')->each(function (object $score): void {
                $opponentAllianceId = DB::table('match_alliances')
                    ->where('match_id', $score->match_id)
                    ->where('alliance_id', '!=', $score->alliance_id)
                    ->whereNull('deleted_at')
                    ->value('alliance_id');

                if ($score->team_id !== null && $score->deleted_at === null) {
                    DB::table('match_alliances')
                        ->where('match_id', $score->match_id)
                        ->where('team_id', $score->team_id)
                        ->update(['score' => DB::raw('score - '.(int) $score->points)]);
                }

                DB::table('scores')->where('id', $score->id)->update([
                    'alliance_id' => $opponentAllianceId ?? $score->alliance_id,
                    'team_id' => null,
                    'points' => abs((int) $score->points),
                ]);
            });

            DB::table('score_types')->whereIn('id', $penaltyIds)->update([
                'referee' => 'penalty',
                'points' => DB::raw('abs(points)'),
                'awarded_to' => 'opponent',
                'target' => 'alliance',
                'kind' => 'count',
                'choice_set' => null,
            ]);

        });
    }

    public function down(): void {}
};
