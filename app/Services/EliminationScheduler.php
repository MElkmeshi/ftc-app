<?php

namespace App\Services;

use App\Enums\EliminationRound;
use App\Enums\MatchStatus;
use App\Enums\MatchType;
use App\Models\Alliance;
use App\Models\AllianceGroup;
use App\Models\CompetitionMatch;
use App\Models\EliminationSeries;
use App\Models\MatchAlliance;
use Exception;
use Illuminate\Support\Collection;

class EliminationScheduler
{
    /**
     * Generate elimination bracket and matches from completed alliance groups.
     */
    public function generate(int $createdBy): void
    {
        $groups = AllianceGroup::whereNotNull('picked_team_id')
            ->orderBy('seed')
            ->get();

        if ($groups->isEmpty()) {
            throw new Exception('No completed alliance groups found.');
        }

        if ($groups->count() < 2) {
            throw new Exception('At least 2 alliance groups are required.');
        }

        if (EliminationSeries::exists()) {
            throw new Exception('Elimination bracket already exists. Reset first.');
        }

        $alliances = Alliance::orderBy('id')->get();
        if ($alliances->count() < 2) {
            throw new Exception('At least 2 alliances (red/blue) are required.');
        }

        $redAllianceId = $alliances[0]->id;
        $blueAllianceId = $alliances[1]->id;

        $lastMatchNumber = CompetitionMatch::max('number') ?? 0;
        $matchNumber = $lastMatchNumber + 1;

        if ($groups->count() === 2) {
            $this->generateFinalSeries($groups[0], $groups[1], $redAllianceId, $blueAllianceId, $matchNumber, $createdBy);
        } elseif ($groups->count() === 4) {
            $this->generateSemifinals($groups, $redAllianceId, $blueAllianceId, $matchNumber, $createdBy);
        } else {
            throw new Exception('Only 2 or 4 alliance groups are supported.');
        }
    }

    private function generateFinalSeries(
        AllianceGroup $group1,
        AllianceGroup $group2,
        int $redAllianceId,
        int $blueAllianceId,
        int &$matchNumber,
        int $createdBy,
    ): EliminationSeries {
        $series = EliminationSeries::create([
            'round' => EliminationRound::FINAL->value,
            'alliance_group_1_id' => $group1->id,
            'alliance_group_2_id' => $group2->id,
            'status' => 'pending',
            'created_by' => $createdBy,
            'updated_by' => $createdBy,
        ]);

        // Match 1: Group1 = Red, Group2 = Blue
        $this->createEliminationMatch($series, $group1, $group2, $redAllianceId, $blueAllianceId, $matchNumber++, $createdBy);

        // Match 2: Group2 = Red, Group1 = Blue (swap home/away)
        $this->createEliminationMatch($series, $group2, $group1, $redAllianceId, $blueAllianceId, $matchNumber++, $createdBy);

        return $series;
    }

    private function generateSemifinals(
        Collection $groups,
        int $redAllianceId,
        int $blueAllianceId,
        int &$matchNumber,
        int $createdBy,
    ): void {
        // Semifinal 1: Seed 1 vs Seed 4
        $sf1 = EliminationSeries::create([
            'round' => EliminationRound::SEMIFINAL_1->value,
            'alliance_group_1_id' => $groups[0]->id,
            'alliance_group_2_id' => $groups[3]->id,
            'status' => 'pending',
            'created_by' => $createdBy,
            'updated_by' => $createdBy,
        ]);

        $this->createEliminationMatch($sf1, $groups[0], $groups[3], $redAllianceId, $blueAllianceId, $matchNumber++, $createdBy);
        $this->createEliminationMatch($sf1, $groups[3], $groups[0], $redAllianceId, $blueAllianceId, $matchNumber++, $createdBy);

        // Semifinal 2: Seed 2 vs Seed 3
        $sf2 = EliminationSeries::create([
            'round' => EliminationRound::SEMIFINAL_2->value,
            'alliance_group_1_id' => $groups[1]->id,
            'alliance_group_2_id' => $groups[2]->id,
            'status' => 'pending',
            'created_by' => $createdBy,
            'updated_by' => $createdBy,
        ]);

        $this->createEliminationMatch($sf2, $groups[1], $groups[2], $redAllianceId, $blueAllianceId, $matchNumber++, $createdBy);
        $this->createEliminationMatch($sf2, $groups[2], $groups[1], $redAllianceId, $blueAllianceId, $matchNumber++, $createdBy);
    }

    /**
     * Create a single elimination match with both teams from each alliance group.
     */
    private function createEliminationMatch(
        EliminationSeries $series,
        AllianceGroup $redGroup,
        AllianceGroup $blueGroup,
        int $redAllianceId,
        int $blueAllianceId,
        int $matchNumber,
        int $createdBy,
    ): CompetitionMatch {
        $match = CompetitionMatch::create([
            'number' => $matchNumber,
            'type' => MatchType::ELIMINATION,
            'round' => $series->round,
            'elimination_series_id' => $series->id,
            'start_time' => now()->addMinutes($matchNumber * 10),
            'status' => MatchStatus::UPCOMING,
            'created_by' => $createdBy,
            'updated_by' => $createdBy,
        ]);

        // Red alliance: both teams from redGroup
        foreach ([$redGroup->captain_team_id, $redGroup->picked_team_id] as $pos => $teamId) {
            MatchAlliance::create([
                'match_id' => $match->id,
                'team_id' => $teamId,
                'alliance_id' => $redAllianceId,
                'alliance_pos' => $pos + 1,
                'score' => 0,
                'alliance_group_id' => $redGroup->id,
                'created_by' => $createdBy,
                'updated_by' => $createdBy,
            ]);
        }

        // Blue alliance: both teams from blueGroup
        foreach ([$blueGroup->captain_team_id, $blueGroup->picked_team_id] as $pos => $teamId) {
            MatchAlliance::create([
                'match_id' => $match->id,
                'team_id' => $teamId,
                'alliance_id' => $blueAllianceId,
                'alliance_pos' => $pos + 1,
                'score' => 0,
                'alliance_group_id' => $blueGroup->id,
                'created_by' => $createdBy,
                'updated_by' => $createdBy,
            ]);
        }

        return $match;
    }

    /**
     * Get the result of a series: wins per alliance group.
     *
     * @return array{group_1_wins: int, group_2_wins: int, completed_matches: int, total_matches: int}
     */
    public function getSeriesResult(EliminationSeries $series): array
    {
        $series->load(['matches.matchAlliances.alliance', 'matches.scores.scoreType']);

        $group1Wins = 0;
        $group2Wins = 0;
        $completedCount = 0;

        foreach ($series->matches as $match) {
            if ($match->status !== MatchStatus::COMPLETED) {
                continue;
            }

            $completedCount++;
            $winnerId = $this->getMatchWinnerGroupId($match, $series);

            if ($winnerId === $series->alliance_group_1_id) {
                $group1Wins++;
            } elseif ($winnerId === $series->alliance_group_2_id) {
                $group2Wins++;
            }
        }

        return [
            'group_1_wins' => $group1Wins,
            'group_2_wins' => $group2Wins,
            'completed_matches' => $completedCount,
            'total_matches' => $series->matches->count(),
        ];
    }

    /**
     * Determine which alliance group won a specific match.
     */
    private function getMatchWinnerGroupId(CompetitionMatch $match, EliminationSeries $series): ?int
    {
        $scoreByGroup = [];

        foreach ($match->matchAlliances as $ma) {
            $groupId = $ma->alliance_group_id;
            if (! $groupId) {
                continue;
            }

            if (! isset($scoreByGroup[$groupId])) {
                $scoreByGroup[$groupId] = 0;
            }

            $scoreByGroup[$groupId] += $ma->score;

            // Add alliance-wide scores
            $allianceWideScore = $match->scores
                ->where('alliance_id', $ma->alliance_id)
                ->whereNull('team_id')
                ->sum(fn ($score) => $score->scoreType->points ?? 0);

            $scoreByGroup[$groupId] += $allianceWideScore;
        }

        $group1Score = $scoreByGroup[$series->alliance_group_1_id] ?? 0;
        $group2Score = $scoreByGroup[$series->alliance_group_2_id] ?? 0;

        if ($group1Score > $group2Score) {
            return $series->alliance_group_1_id;
        }

        if ($group2Score > $group1Score) {
            return $series->alliance_group_2_id;
        }

        return null; // tie
    }

    /**
     * Determine the series winner. Returns null if tied (tiebreaker needed).
     */
    public function determineSeriesWinner(EliminationSeries $series): ?AllianceGroup
    {
        $result = $this->getSeriesResult($series);

        if ($result['group_1_wins'] > $result['group_2_wins']) {
            $series->update([
                'winner_alliance_group_id' => $series->alliance_group_1_id,
                'status' => 'completed',
            ]);

            return AllianceGroup::find($series->alliance_group_1_id);
        }

        if ($result['group_2_wins'] > $result['group_1_wins']) {
            $series->update([
                'winner_alliance_group_id' => $series->alliance_group_2_id,
                'status' => 'completed',
            ]);

            return AllianceGroup::find($series->alliance_group_2_id);
        }

        // Update status to in_progress if matches are being played
        if ($result['completed_matches'] > 0 && $series->status === 'pending') {
            $series->update(['status' => 'in_progress']);
        }

        return null;
    }

    /**
     * Generate a tiebreaker match for a tied series.
     */
    public function generateTiebreaker(EliminationSeries $series, int $createdBy): CompetitionMatch
    {
        if ($series->winner_alliance_group_id !== null) {
            throw new Exception('Series already has a winner.');
        }

        $result = $this->getSeriesResult($series);
        if ($result['group_1_wins'] !== $result['group_2_wins']) {
            throw new Exception('Series is not tied. Cannot generate tiebreaker.');
        }

        $alliances = Alliance::orderBy('id')->get();
        $redAllianceId = $alliances[0]->id;
        $blueAllianceId = $alliances[1]->id;

        $matchNumber = (CompetitionMatch::max('number') ?? 0) + 1;

        $group1 = AllianceGroup::findOrFail($series->alliance_group_1_id);
        $group2 = AllianceGroup::findOrFail($series->alliance_group_2_id);

        // Higher seed (group 1) gets red (home)
        $match = $this->createEliminationMatch(
            $series,
            $group1,
            $group2,
            $redAllianceId,
            $blueAllianceId,
            $matchNumber,
            $createdBy,
        );

        // Override round to tiebreaker variant
        $tiebreakerRound = match ($series->round) {
            EliminationRound::SEMIFINAL_1->value => EliminationRound::TIEBREAKER_SEMIFINAL_1->value,
            EliminationRound::SEMIFINAL_2->value => EliminationRound::TIEBREAKER_SEMIFINAL_2->value,
            default => EliminationRound::TIEBREAKER_FINAL->value,
        };

        $match->update(['round' => $tiebreakerRound]);

        return $match;
    }

    /**
     * Advance the bracket after a semifinal series is completed (for 4-team brackets).
     */
    public function advanceBracket(EliminationSeries $completedSeries, int $createdBy): ?EliminationSeries
    {
        if ($completedSeries->winner_alliance_group_id === null) {
            throw new Exception('Series must have a winner to advance bracket.');
        }

        $round = $completedSeries->round;
        if (! in_array($round, [EliminationRound::SEMIFINAL_1->value, EliminationRound::SEMIFINAL_2->value])) {
            return null; // Only semifinals advance
        }

        // Check if both semifinals are complete
        $sf1 = EliminationSeries::where('round', EliminationRound::SEMIFINAL_1->value)->first();
        $sf2 = EliminationSeries::where('round', EliminationRound::SEMIFINAL_2->value)->first();

        if (! $sf1?->winner_alliance_group_id || ! $sf2?->winner_alliance_group_id) {
            return null; // Other semifinal not done yet
        }

        // Check if final already exists
        if (EliminationSeries::where('round', EliminationRound::FINAL->value)->exists()) {
            return null;
        }

        $winner1 = AllianceGroup::findOrFail($sf1->winner_alliance_group_id);
        $winner2 = AllianceGroup::findOrFail($sf2->winner_alliance_group_id);

        $alliances = Alliance::orderBy('id')->get();
        $redAllianceId = $alliances[0]->id;
        $blueAllianceId = $alliances[1]->id;

        $matchNumber = (CompetitionMatch::max('number') ?? 0) + 1;

        // Higher seed gets home advantage in match 1
        $homeGroup = $winner1->seed < $winner2->seed ? $winner1 : $winner2;
        $awayGroup = $homeGroup->id === $winner1->id ? $winner2 : $winner1;

        return $this->generateFinalSeries($homeGroup, $awayGroup, $redAllianceId, $blueAllianceId, $matchNumber, $createdBy);
    }

    /**
     * Get the full elimination bracket state.
     *
     * @return array{series: Collection, alliance_groups: Collection}
     */
    public function getBracket(): array
    {
        $series = EliminationSeries::with([
            'allianceGroup1.captainTeam', 'allianceGroup1.pickedTeam',
            'allianceGroup2.captainTeam', 'allianceGroup2.pickedTeam',
            'winner.captainTeam', 'winner.pickedTeam',
            'matches.matchAlliances.team', 'matches.matchAlliances.alliance', 'matches.scores.scoreType',
        ])->get();

        $groups = AllianceGroup::with(['captainTeam', 'pickedTeam'])
            ->orderBy('seed')
            ->get();

        // Add series results
        $seriesWithResults = $series->map(function ($s) {
            $result = $this->getSeriesResult($s);
            $s->setAttribute('result', $result);

            return $s;
        });

        return [
            'series' => $seriesWithResults,
            'alliance_groups' => $groups,
        ];
    }

    /**
     * Reset all elimination data.
     */
    public function reset(): void
    {
        // Delete elimination matches and their match_alliances
        $eliminationMatchIds = CompetitionMatch::elimination()->pluck('id');

        \App\Models\Score::whereIn('match_id', $eliminationMatchIds)->forceDelete();
        MatchAlliance::whereIn('match_id', $eliminationMatchIds)->forceDelete();
        CompetitionMatch::elimination()->forceDelete();

        EliminationSeries::truncate();
    }
}
