<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scores', function (Blueprint $table): void {
            $table->integer('points')->default(0);
            $table->unsignedBigInteger('score_type_id')->nullable()->change();
        });

        DB::transaction(function (): void {
            $pointsByType = DB::table('score_types')->pluck('points', 'id');

            foreach ($pointsByType as $typeId => $points) {
                DB::table('scores')->where('score_type_id', $typeId)->update(['points' => $points]);
            }

            DB::table('match_alliances')->whereNull('score')->update(['score' => 0]);
            DB::table('match_alliances')->whereNull('deleted_at')->orderBy('id')->chunkById(200, function ($members): void {
                $recordedTotals = DB::table('scores')->whereIn('match_id', $members->pluck('match_id'))
                    ->whereNotNull('team_id')->whereNull('deleted_at')
                    ->select('match_id', 'team_id')->selectRaw('SUM(points) as total')
                    ->groupBy('match_id', 'team_id')->get()->keyBy(fn ($row): string => $row->match_id.':'.$row->team_id);

                foreach ($members as $member) {
                    $recordedTotal = $recordedTotals->get($member->match_id.':'.$member->team_id)?->total ?? 0;
                    $adjustment = $member->score - $recordedTotal;

                    if ($adjustment !== 0) {
                        DB::table('scores')->insert([
                            'match_id' => $member->match_id,
                            'team_id' => $member->team_id,
                            'alliance_id' => $member->alliance_id,
                            'score_type_id' => null,
                            'points' => $adjustment,
                            'created_by' => $member->updated_by ?? $member->created_by,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            });
        });
    }

    public function down(): void
    {
        DB::table('scores')->whereNull('score_type_id')->delete();

        Schema::table('scores', function (Blueprint $table): void {
            $table->dropColumn('points');
            $table->unsignedBigInteger('score_type_id')->nullable(false)->change();
        });
    }
};
