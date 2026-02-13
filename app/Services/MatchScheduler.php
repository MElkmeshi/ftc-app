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

class MatchScheduler
{
    private array $teamMatchCounts = [];

    private array $teamPartners = [];

    private array $teamOpponents = [];

    private int $maxIterations = 100;

    public function generate(
        int $minMatchesPerTeam = 3,
        int $createdBy = 1,
        int $teamsPerAlliance = 1,
        ?int $maxScoringMatches = null
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

        if ($alliancesCount !== 2) {
            throw new Exception('This algorithm currently supports exactly 2 alliances');
        }

        $teamsPerMatch = $teamsPerAlliance * $alliancesCount;

        if ($teamCount < $teamsPerMatch) {
            throw new Exception("Not enough teams for a full match. At least {$teamsPerMatch} teams are required, but found {$teamCount}.");
        }
        if ($minMatchesPerTeam <= 0) {
            throw new Exception('Minimum matches per team must be a positive number.');
        }

        // Initialize tracking arrays
        $this->initializeTracking($teamIds);

        // Disable foreign key checks based on database driver
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        } elseif ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF;');
        }

        Score::truncate();
        MatchAlliance::truncate();
        CompetitionMatch::truncate();

        // Re-enable foreign key checks
        if ($driver === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        } elseif ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = ON;');
        }

        $matchNumber = 1;
        $iterations = 0;

        // Schedule matches until all teams meet minimum requirement
        while (! $this->allTeamsMetMinimum($minMatchesPerTeam) && $iterations < $this->maxIterations) {
            // Select teams for next match
            $selectedTeams = $this->selectTeamsForMatch($teamIds, $teamsPerMatch);
            if ($selectedTeams === null) {
                throw new Exception('Cannot form match: Not enough available teams');
            }

            // Form alliances with partnership diversity optimization
            [$alliance1Teams, $alliance2Teams] = $this->formAlliances($selectedTeams, $teamsPerAlliance);

            // Create the match
            $competitionMatch = CompetitionMatch::create([
                'number' => $matchNumber,
                'start_time' => now()->addMinutes($matchNumber * 10),
                'status' => MatchStatus::UPCOMING,
                'created_by' => $createdBy,
                'updated_by' => $createdBy,
            ]);

            // Assign teams to alliances
            $this->assignTeamsToAlliances(
                $competitionMatch->id,
                $alliance1Teams,
                $alliance2Teams,
                $allianceIds,
                $createdBy,
                $maxScoringMatches
            );

            // Update tracking statistics
            $this->updateTracking($selectedTeams, $alliance1Teams, $alliance2Teams);

            $matchNumber++;
            $iterations++;
        }

        if ($iterations >= $this->maxIterations) {
            throw new Exception('Maximum iterations reached while scheduling matches');
        }
    }

    private function initializeTracking(array $teamIds): void
    {
        foreach ($teamIds as $teamId) {
            $this->teamMatchCounts[$teamId] = 0;
            $this->teamPartners[$teamId] = [];
            $this->teamOpponents[$teamId] = [];
        }
    }

    private function allTeamsMetMinimum(int $minMatches): bool
    {
        foreach ($this->teamMatchCounts as $count) {
            if ($count < $minMatches) {
                return false;
            }
        }

        return true;
    }

    private function getTeamsWithFewestMatches(array $availableTeams): array
    {
        $minCount = min(array_map(fn ($team) => $this->teamMatchCounts[$team], $availableTeams));

        return array_filter($availableTeams, fn ($team) => $this->teamMatchCounts[$team] === $minCount);
    }

    private function selectTeamsForMatch(array $teamIds, int $teamsPerMatch): ?array
    {
        if (count($teamIds) < $teamsPerMatch) {
            return null;
        }

        // Prioritize teams with fewer matches
        $teamsWithMinMatches = $this->getTeamsWithFewestMatches($teamIds);

        if (count($teamsWithMinMatches) >= $teamsPerMatch) {
            // Randomly select from teams with minimum matches
            shuffle($teamsWithMinMatches);

            return array_slice($teamsWithMinMatches, 0, $teamsPerMatch);
        } else {
            // Take all teams with minimum matches, then add others
            $selected = $teamsWithMinMatches;
            $remaining = array_diff($teamIds, $selected);
            shuffle($remaining);
            $needed = $teamsPerMatch - count($selected);

            return array_merge($selected, array_slice($remaining, 0, $needed));
        }
    }

    private function formAlliances(array $teams, int $teamsPerAlliance): array
    {
        // Generate all possible ways to split teams into two alliances
        $allPossibleSplits = $this->getCombinations($teams, $teamsPerAlliance);

        // Score each split based on partnership diversity (lower is better)
        $scoredSplits = [];

        foreach ($allPossibleSplits as $alliance1Combo) {
            $alliance2 = array_values(array_diff($teams, $alliance1Combo));

            // Calculate partnership score
            $partnershipScore = $this->calculatePartnershipScore($alliance1Combo) +
                                $this->calculatePartnershipScore($alliance2);

            $scoredSplits[] = [
                'score' => $partnershipScore,
                'alliance1' => $alliance1Combo,
                'alliance2' => $alliance2,
            ];
        }

        // Sort by score and pick the best split
        usort($scoredSplits, fn ($a, $b) => $a['score'] <=> $b['score']);

        return [$scoredSplits[0]['alliance1'], $scoredSplits[0]['alliance2']];
    }

    private function getCombinations(array $items, int $size): array
    {
        if ($size === 0) {
            return [[]];
        }
        if (count($items) === 0) {
            return [];
        }

        $combinations = [];
        $first = array_shift($items);

        // Get combinations that include the first item
        $withFirst = $this->getCombinations($items, $size - 1);
        foreach ($withFirst as $combo) {
            $combinations[] = array_merge([$first], $combo);
        }

        // Get combinations that don't include the first item
        $withoutFirst = $this->getCombinations($items, $size);
        $combinations = array_merge($combinations, $withoutFirst);

        return $combinations;
    }

    private function calculatePartnershipScore(array $alliance): int
    {
        $score = 0;
        $allianceCount = count($alliance);

        for ($i = 0; $i < $allianceCount; $i++) {
            for ($j = $i + 1; $j < $allianceCount; $j++) {
                $team1 = $alliance[$i];
                $team2 = $alliance[$j];

                // Count how many times these teams have been partners before
                if (in_array($team2, $this->teamPartners[$team1])) {
                    $score++;
                }
            }
        }

        return $score;
    }

    private function assignTeamsToAlliances(
        int $matchId,
        array $alliance1Teams,
        array $alliance2Teams,
        array $allianceIds,
        int $createdBy,
        ?int $maxScoringMatches = null
    ): void {
        // Assign alliance 1
        foreach ($alliance1Teams as $index => $teamId) {
            $countsForRanking = $maxScoringMatches === null || $this->teamMatchCounts[$teamId] < $maxScoringMatches;

            MatchAlliance::create([
                'match_id' => $matchId,
                'team_id' => $teamId,
                'alliance_id' => $allianceIds[0],
                'alliance_pos' => $index + 1,
                'score' => 0,
                'counts_for_ranking' => $countsForRanking,
                'created_by' => $createdBy,
                'updated_by' => $createdBy,
            ]);
        }

        // Assign alliance 2
        foreach ($alliance2Teams as $index => $teamId) {
            $countsForRanking = $maxScoringMatches === null || $this->teamMatchCounts[$teamId] < $maxScoringMatches;

            MatchAlliance::create([
                'match_id' => $matchId,
                'team_id' => $teamId,
                'alliance_id' => $allianceIds[1],
                'alliance_pos' => $index + 1,
                'score' => 0,
                'counts_for_ranking' => $countsForRanking,
                'created_by' => $createdBy,
                'updated_by' => $createdBy,
            ]);
        }
    }

    private function updateTracking(array $selectedTeams, array $alliance1Teams, array $alliance2Teams): void
    {
        // Update match counts
        foreach ($selectedTeams as $teamId) {
            $this->teamMatchCounts[$teamId]++;
        }

        // Update partners and opponents for alliance 1
        $alliance1Count = count($alliance1Teams);
        for ($i = 0; $i < $alliance1Count; $i++) {
            $team1 = $alliance1Teams[$i];

            for ($j = $i + 1; $j < $alliance1Count; $j++) {
                $team2 = $alliance1Teams[$j];
                $this->addPartner($team1, $team2);
            }

            foreach ($alliance2Teams as $opponent) {
                $this->addOpponent($team1, $opponent);
            }
        }

        // Update partners within alliance 2
        $alliance2Count = count($alliance2Teams);
        for ($i = 0; $i < $alliance2Count; $i++) {
            for ($j = $i + 1; $j < $alliance2Count; $j++) {
                $this->addPartner($alliance2Teams[$i], $alliance2Teams[$j]);
            }
        }
    }

    private function addPartner(int $team1, int $team2): void
    {
        if (! in_array($team2, $this->teamPartners[$team1])) {
            $this->teamPartners[$team1][] = $team2;
        }
        if (! in_array($team1, $this->teamPartners[$team2])) {
            $this->teamPartners[$team2][] = $team1;
        }
    }

    private function addOpponent(int $team1, int $team2): void
    {
        if (! in_array($team2, $this->teamOpponents[$team1])) {
            $this->teamOpponents[$team1][] = $team2;
        }
        if (! in_array($team1, $this->teamOpponents[$team2])) {
            $this->teamOpponents[$team2][] = $team1;
        }
    }
}
