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
use App\Models\Score;
use Exception;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class EliminationScheduler
{
    /**
     * Generate elimination bracket and matches from completed alliance groups.
     */
    public function generate(int $createdBy): void
    {
        $groups = AllianceGroup::query()->orderBy('seed')->get()
            ->filter(fn (AllianceGroup $group): bool => $group->openPick() === null)
            ->values();

        if ($groups->isEmpty()) {
            throw new Exception('No completed alliance groups found.');
        }

        if ($groups->count() < 2) {
            throw new Exception('At least 2 alliance groups are required.');
        }

        if (EliminationSeries::exists()) {
            throw new Exception('Elimination bracket already exists. Reset first.');
        }

        if (Alliance::count() < 2) {
            throw new Exception('At least 2 alliances (red/blue) are required.');
        }

        $firstRound = match ($groups->count()) {
            2 => [EliminationRound::FINAL->value => [1, 2]],
            4 => [EliminationRound::SEMIFINAL_1->value => [1, 4], EliminationRound::SEMIFINAL_2->value => [2, 3]],
            8 => [
                EliminationRound::QUARTERFINAL_1->value => [1, 8],
                EliminationRound::QUARTERFINAL_2->value => [4, 5],
                EliminationRound::QUARTERFINAL_3->value => [2, 7],
                EliminationRound::QUARTERFINAL_4->value => [3, 6],
            ],
            default => throw new Exception('Only 2, 4 or 8 alliance groups are supported.'),
        };

        foreach ($firstRound as $round => [$homeSeed, $awaySeed]) {
            $this->createSeries(EliminationRound::from($round), $groups[$homeSeed - 1], $groups[$awaySeed - 1], $createdBy);
        }
    }

    /**
     * A series of two matches between two alliances. The first named
     * alliance is red in the first match and blue in the second.
     */
    private function createSeries(EliminationRound $round, AllianceGroup $home, AllianceGroup $away, int $createdBy): EliminationSeries
    {
        $series = EliminationSeries::create([
            'round' => $round->value,
            'alliance_group_1_id' => $home->id,
            'alliance_group_2_id' => $away->id,
            'status' => 'pending',
            'created_by' => $createdBy,
            'updated_by' => $createdBy,
        ]);

        $this->createEliminationMatch($series, $home, $away, $createdBy);
        $this->createEliminationMatch($series, $away, $home, $createdBy);

        return $series;
    }

    /**
     * Create a single elimination match with every team of both alliances.
     */
    private function createEliminationMatch(EliminationSeries $series, AllianceGroup $redGroup, AllianceGroup $blueGroup, int $createdBy): CompetitionMatch
    {
        [$redAllianceId, $blueAllianceId] = Alliance::query()->orderBy('id')->limit(2)->pluck('id')->all();
        $matchNumber = (CompetitionMatch::query()->competitive()->max('number') ?? 0) + 1;

        $match = CompetitionMatch::create([
            'number' => $matchNumber,
            'field' => app(FieldAssignment::class)->fieldFor($matchNumber),
            'type' => MatchType::ELIMINATION,
            'round' => $series->round,
            'elimination_series_id' => $series->id,
            'start_time' => now()->addMinutes($matchNumber * 10),
            'status' => MatchStatus::UPCOMING,
            'created_by' => $createdBy,
            'updated_by' => $createdBy,
        ]);

        foreach ([[$redGroup, $redAllianceId], [$blueGroup, $blueAllianceId]] as [$group, $allianceId]) {
            foreach ($group->memberIds() as $position => $teamId) {
                MatchAlliance::create([
                    'match_id' => $match->id,
                    'team_id' => $teamId,
                    'alliance_id' => $allianceId,
                    'alliance_pos' => $position + 1,
                    'score' => 0,
                    'alliance_group_id' => $group->id,
                    'created_by' => $createdBy,
                    'updated_by' => $createdBy,
                ]);
            }
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
     * Determine which alliance group won a specific match. A red card on any
     * of an alliance's teams disqualifies the whole alliance from the match.
     */
    private function getMatchWinnerGroupId(CompetitionMatch $match, EliminationSeries $series): ?int
    {
        $scoreByGroup = [];

        foreach ($match->matchAlliances->whereNotNull('alliance_group_id')->groupBy('alliance_group_id') as $groupId => $members) {
            $allianceIds = $members->pluck('alliance_id')->unique();
            $scoreByGroup[$groupId] = $members->sum('score') + $match->scores
                ->whereIn('alliance_id', $allianceIds)
                ->whereNull('team_id')
                ->sum('points');
        }

        $disqualified = $match->matchAlliances
            ->filter(fn (MatchAlliance $member): bool => $member->isDisqualified())
            ->pluck('alliance_group_id')
            ->unique();

        if ($disqualified->count() === 1) {
            return $disqualified->first() === $series->alliance_group_1_id ? $series->alliance_group_2_id : $series->alliance_group_1_id;
        }

        if ($disqualified->count() > 1) {
            return null;
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
     * The alliance group that has won the series, or null while it is still
     * open: a group wins only once its lead is more than the matches still to
     * be played, so 1-0 with a match left is not a win.
     *
     * @param  array{group_1_wins: int, group_2_wins: int, completed_matches: int, total_matches: int}  $result
     */
    private function decidedWinnerId(EliminationSeries $series, array $result): ?int
    {
        $remaining = $result['total_matches'] - $result['completed_matches'];

        return match (true) {
            $result['group_1_wins'] > $result['group_2_wins'] + $remaining => $series->alliance_group_1_id,
            $result['group_2_wins'] > $result['group_1_wins'] + $remaining => $series->alliance_group_2_id,
            default => null,
        };
    }

    /**
     * Determine the series winner. Returns null while the series is open or
     * tied (a tiebreaker is needed once every match is played).
     */
    public function determineSeriesWinner(EliminationSeries $series): ?AllianceGroup
    {
        return $series->getConnection()->transaction(function () use ($series): ?AllianceGroup {
            $series = EliminationSeries::query()->lockForUpdate()->findOrFail($series->id);
            $result = $this->getSeriesResult($series);
            $winnerId = $this->decidedWinnerId($series, $result);

            if ($winnerId !== null) {
                $series->update(['winner_alliance_group_id' => $winnerId, 'status' => 'completed']);
                app(AllianceAwards::class)->sync();

                return AllianceGroup::find($winnerId);
            }

            if ($result['completed_matches'] > 0 && $series->status === 'pending') {
                $series->update(['status' => 'in_progress']);
            }

            return null;
        }, 3);
    }

    /**
     * Generate a tiebreaker match for a series whose matches are all played
     * and split evenly.
     */
    public function generateTiebreaker(EliminationSeries $series, int $createdBy): CompetitionMatch
    {
        return $series->getConnection()->transaction(function () use ($series, $createdBy): CompetitionMatch {
            $series = EliminationSeries::query()->lockForUpdate()->findOrFail($series->id);

            if ($series->winner_alliance_group_id !== null) {
                throw new Exception('Series already has a winner.');
            }

            $result = $this->getSeriesResult($series);
            if ($result['completed_matches'] < $result['total_matches']) {
                throw new Exception('Play every match of the series before adding a tiebreaker.');
            }
            if ($result['completed_matches'] === 0 || $result['group_1_wins'] !== $result['group_2_wins']) {
                throw new Exception('Series is not tied. Cannot generate tiebreaker.');
            }

            $group1 = AllianceGroup::findOrFail($series->alliance_group_1_id);
            $group2 = AllianceGroup::findOrFail($series->alliance_group_2_id);

            $match = $this->createEliminationMatch($series, $group1, $group2, $createdBy);
            $match->update(['round' => EliminationRound::from($series->round)->tiebreaker()->value]);

            return $match;
        }, 3);
    }

    /**
     * Keeps the bracket in step with a completed playoff match, when it is
     * finished and whenever its score is corrected afterwards. A series is
     * given its winner as soon as it is decided, and the final is created
     * once both semifinals have one. If a correction changes who won a
     * semifinal, a final that has not been played yet is rebuilt with the
     * right alliances; one already under way is left alone and the
     * correction refused, since replaying it needs a deliberate bracket
     * reset.
     *
     * Call inside the transaction that changed the match.
     *
     * @return bool whether the bracket changed.
     */
    public function reconcileAfterScoreChange(CompetitionMatch $match, int $createdBy): bool
    {
        if ($match->elimination_series_id === null || $match->status !== MatchStatus::COMPLETED) {
            return false;
        }

        $series = EliminationSeries::query()->lockForUpdate()->find($match->elimination_series_id);

        if ($series === null) {
            return false;
        }

        if ($series->winner_alliance_group_id === null) {
            if ($this->determineSeriesWinner($series) === null) {
                return false;
            }

            $this->advanceBracket($series->fresh(), $createdBy);

            return true;
        }

        if ($this->decidedWinnerId($series, $this->getSeriesResult($series)) === $series->winner_alliance_group_id) {
            return false;
        }

        $nextRound = EliminationRound::from($series->round)->next();
        $next = $nextRound === null ? null : EliminationSeries::query()->with('matches')->where('round', $nextRound->value)->first();

        if ($next !== null && $next->matches->contains(fn (CompetitionMatch $nextMatch): bool => $nextMatch->status !== MatchStatus::UPCOMING)) {
            throw ValidationException::withMessages([
                'match_id' => 'This correction changes who won the series, but the next round has already started. Reset the bracket to replay it.',
            ]);
        }

        if ($next !== null) {
            $nextMatchIds = $next->matches->pluck('id');
            Score::whereIn('match_id', $nextMatchIds)->forceDelete();
            MatchAlliance::whereIn('match_id', $nextMatchIds)->forceDelete();
            CompetitionMatch::query()->whereIn('id', $nextMatchIds)->forceDelete();
            $next->delete();
        }

        $series->update(['winner_alliance_group_id' => null, 'status' => 'in_progress']);
        app(AllianceAwards::class)->sync();

        if ($this->determineSeriesWinner($series) !== null) {
            $this->advanceBracket($series->fresh(), $createdBy);
        }

        return true;
    }

    /**
     * Once both series that feed the next round have a winner, creates the
     * series between them. The better seed is red in the first match.
     */
    public function advanceBracket(EliminationSeries $completedSeries, int $createdBy): ?EliminationSeries
    {
        if ($completedSeries->winner_alliance_group_id === null) {
            throw new Exception('Series must have a winner to advance bracket.');
        }

        $nextRound = EliminationRound::from($completedSeries->round)->next();

        if ($nextRound === null || EliminationSeries::where('round', $nextRound->value)->exists()) {
            return null;
        }

        $winners = EliminationSeries::query()
            ->whereIn('round', array_map(fn (EliminationRound $round): string => $round->value, $nextRound->feeders()))
            ->whereNotNull('winner_alliance_group_id')
            ->with('winner')
            ->get()
            ->map(fn (EliminationSeries $series): AllianceGroup => $series->winner)
            ->sortBy('seed')
            ->values();

        if ($winners->count() < 2) {
            return null;
        }

        return $this->createSeries($nextRound, $winners[0], $winners[1], $createdBy);
    }

    /**
     * Get the full elimination bracket state.
     *
     * @return array{series: Collection, alliance_groups: Collection}
     */
    public function getBracket(): array
    {
        $series = EliminationSeries::with([
            'allianceGroup1.captainTeam', 'allianceGroup1.pickedTeam', 'allianceGroup1.secondPickedTeam',
            'allianceGroup2.captainTeam', 'allianceGroup2.pickedTeam', 'allianceGroup2.secondPickedTeam',
            'winner.captainTeam', 'winner.pickedTeam', 'winner.secondPickedTeam',
            'matches.matchAlliances.team', 'matches.matchAlliances.alliance', 'matches.scores.scoreType',
        ])->get();

        $groups = AllianceGroup::with(['captainTeam', 'pickedTeam', 'secondPickedTeam'])
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

        Score::whereIn('match_id', $eliminationMatchIds)->forceDelete();
        MatchAlliance::whereIn('match_id', $eliminationMatchIds)->forceDelete();
        CompetitionMatch::elimination()->forceDelete();

        EliminationSeries::query()->delete();
        app(AllianceAwards::class)->sync();
    }
}
