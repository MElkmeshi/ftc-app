<?php

namespace App\Services;

use App\Enums\MatchStatus;
use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\Score;
use App\Models\Team;
use Exception;
use Illuminate\Support\Facades\DB;
use LogicException;

class MatchScheduler
{
    public function generate(
        int $matchesPerTeam = 3,
        int $createdBy = 1,
        int $teamsPerAlliance = 1
    ): void {
        $teams = Team::all();
        if ($teams->isEmpty()) {
            throw new Exception('No teams available to schedule matches.');
        }
        $teamIds = $teams->pluck('id')->all();
        $teamCount = count($teamIds);

        $alliances = Alliance::orderBy('id')->get();
        if ($alliances->isEmpty()) {
            throw new Exception('No alliances available to schedule matches.');
        }
        $allianceIds = $alliances->pluck('id')->all();
        $alliancesCount = count($allianceIds);

        $teamsPerMatch = $teamsPerAlliance * $alliancesCount;

        if ($teamCount < $teamsPerMatch) {
            throw new Exception("Not enough teams for a full match. At least {$teamsPerMatch} teams are required, but found {$teamCount}.");
        }
        if ($matchesPerTeam <= 0) {
            throw new Exception('Matches per team (rounds) must be a positive number.');
        }

        DB::beginTransaction();
        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            Score::truncate();
            MatchAlliance::truncate();
            CompetitionMatch::truncate();
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');

            $overallMatchCounter = 0;
            $allTeamIdsCollection = collect($teamIds);

            for ($roundNumber = 1; $roundNumber <= $matchesPerTeam; $roundNumber++) {
                $teamsAvailableForThisRound = collect($teamIds)->shuffle()->all();

                $numMatchesInThisRound = (int) ceil($teamCount / $teamsPerMatch);

                for ($matchIndexInRound = 0; $matchIndexInRound < $numMatchesInThisRound; $matchIndexInRound++) {
                    $overallMatchCounter++;
                    $competitionMatch = CompetitionMatch::create([
                        'number' => $overallMatchCounter,
                        'start_time' => now()->addMinutes($overallMatchCounter * 10),
                        'status' => MatchStatus::UPCOMING,
                        'created_by' => $createdBy,
                        'updated_by' => $createdBy,
                    ]);

                    $teamsAssignedToCurrentMatch = [];

                    $numNonSurrogatesToPick = min(count($teamsAvailableForThisRound), $teamsPerMatch);
                    for ($i = 0; $i < $numNonSurrogatesToPick; $i++) {
                        $teamsAssignedToCurrentMatch[] = array_shift($teamsAvailableForThisRound);
                    }

                    $numSurrogatesNeeded = $teamsPerMatch - count($teamsAssignedToCurrentMatch);
                    if ($numSurrogatesNeeded > 0) {
                        $candidateSurrogatePool = $allTeamIdsCollection->diff($teamsAssignedToCurrentMatch);

                        if ($candidateSurrogatePool->count() < $numSurrogatesNeeded) {
                            throw new LogicException(
                                "Insufficient unique teams to select as surrogates for match {$overallMatchCounter}. ".
                                "Needed: {$numSurrogatesNeeded}, Available in pool (excluding non-surrogates for this match): {$candidateSurrogatePool->count()}."
                            );
                        }

                        $selectedSurrogates = $candidateSurrogatePool->shuffle()->take($numSurrogatesNeeded)->all();
                        $teamsAssignedToCurrentMatch = array_merge($teamsAssignedToCurrentMatch, $selectedSurrogates);
                    }

                    if (count($teamsAssignedToCurrentMatch) !== $teamsPerMatch) {
                        throw new LogicException(
                            "Match {$overallMatchCounter} could not be filled correctly. ".
                            "Expected {$teamsPerMatch} teams, got ".count($teamsAssignedToCurrentMatch).'.'
                        );
                    }

                    shuffle($teamsAssignedToCurrentMatch);

                    $teamAssignmentIndex = 0;
                    foreach ($allianceIds as $allianceId) {
                        for ($positionInAlliance = 1; $positionInAlliance <= $teamsPerAlliance; $positionInAlliance++) {
                            if ($teamAssignmentIndex < count($teamsAssignedToCurrentMatch)) {
                                $teamIdToAssign = $teamsAssignedToCurrentMatch[$teamAssignmentIndex++];
                                MatchAlliance::create([
                                    'match_id' => $competitionMatch->id,
                                    'team_id' => $teamIdToAssign,
                                    'alliance_id' => $allianceId,
                                    'alliance_pos' => $positionInAlliance,
                                    'score' => 0,
                                    'created_by' => $createdBy,
                                    'updated_by' => $createdBy,
                                ]);
                            } else {
                                throw new LogicException("Error assigning teams to alliance positions for match {$competitionMatch->id}. Index out of bounds.");
                            }
                        }
                    }
                }
            }
        } catch (Exception $e) {
            throw $e;
        }
    }
}
