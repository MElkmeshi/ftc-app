<?php

namespace App\Services;

use App\Enums\MatchStatus;
use App\Enums\RankingMethod;
use App\Models\AllianceGroup;
use App\Models\AllianceSelectionDecline;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\Team;
use Exception;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AllianceSelectionService
{
    public function __construct(private EliminationScheduler $eliminationScheduler) {}

    /**
     * Get team rankings from completed qualification matches. A team with a
     * red card in a match is disqualified from it: the match counts as a
     * loss that earns it no points, while its partner keeps the result.
     *
     * @return Collection<int, array{team_id: int, team_number: int|string, team_name: string, alliance_color: ?string, team_score: int, alliance_score: int, total_score: int, rank: int}>
     */
    public function getRankings(): Collection
    {
        $completedMatches = CompetitionMatch::with(['matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType'])
            ->qualification()
            ->where('status', MatchStatus::COMPLETED)
            ->get();

        if ($completedMatches->isEmpty()) {
            return collect();
        }

        $teamScores = [];

        foreach ($completedMatches as $match) {
            $allianceTotals = $this->allianceTotals($match);

            foreach ($match->matchAlliances as $ma) {
                if (! $ma->counts_for_ranking) {
                    continue;
                }

                /**
                 * Teams are soft-deleted, so a team that withdrew mid-event still
                 * has match_alliances rows but no loadable team. Skip them rather
                 * than fataling on a null relation.
                 */
                if ($ma->team === null) {
                    continue;
                }

                $teamId = $ma->team->id;

                $teamScores[$teamId] ??= [
                    'team_id' => $ma->team->id,
                    'team_number' => $ma->team->number,
                    'team_name' => $ma->team->name,
                    'alliance_color' => $ma->alliance?->color,
                    'team_score' => 0,
                    'alliance_score' => 0,
                    'total_score' => 0,
                    'played' => 0,
                    'wins' => 0,
                    'losses' => 0,
                    'ties' => 0,
                    'ranking_points' => 0,
                    'average_score' => 0,
                    'highest_score' => 0,
                    'match_points' => 0,
                ];

                $team = &$teamScores[$teamId];
                $team['played']++;

                if ($ma->isDisqualified()) {
                    $team['losses']++;
                    $team['ranking_points'] = $this->tidyNumber((2 * $team['wins'] + $team['ties']) / $team['played']);
                    $team['average_score'] = $this->tidyNumber($team['match_points'] / $team['played']);

                    unset($team);

                    continue;
                }

                $team['team_score'] += $ma->score ?? 0;

                $allianceWideScore = $match->scores
                    ->where('alliance_id', $ma->alliance_id)
                    ->whereNull('team_id')
                    ->sum('points');

                $team['alliance_score'] += $allianceWideScore;
                $team['total_score'] = $team['team_score'] + $team['alliance_score'];

                $ownTotal = $allianceTotals[$ma->alliance_id] ?? 0;
                $opponentTotal = collect($allianceTotals)->except($ma->alliance_id)->max() ?? 0;

                $team['match_points'] += $ownTotal;
                $team['highest_score'] = max($team['highest_score'], $ownTotal);

                match ($ownTotal <=> $opponentTotal) {
                    1 => $team['wins']++,
                    -1 => $team['losses']++,
                    0 => $team['ties']++,
                };

                $team['ranking_points'] = $this->tidyNumber((2 * $team['wins'] + $team['ties']) / $team['played']);
                $team['average_score'] = $this->tidyNumber($team['match_points'] / $team['played']);

                unset($team);
            }
        }

        $order = match (RankingMethod::current()) {
            RankingMethod::Record => [['ranking_points', 'desc'], ['average_score', 'desc'], ['highest_score', 'desc'], ['team_number', 'asc']],
            RankingMethod::TotalScore => [['total_score', 'desc'], ['team_number', 'asc']],
        };

        return collect($teamScores)
            ->map(fn (array $team): array => collect($team)->except('match_points')->all())
            ->sortBy($order)
            ->values()
            ->map(function ($team, $index) {
                $team['rank'] = $index + 1;

                return $team;
            });
    }

    /**
     * Two decimal places, as a whole number when there is no fraction, so values
     * look the same before and after a JSON round trip.
     */
    private function tidyNumber(float|int $value): float|int
    {
        $rounded = round($value, 2);

        return floor($rounded) === $rounded ? (int) $rounded : $rounded;
    }

    /**
     * Each alliance's score in one match: its teams' points plus alliance-wide points.
     *
     * @return array<int, int>
     */
    private function allianceTotals(CompetitionMatch $match): array
    {
        $totals = [];

        foreach ($match->matchAlliances as $ma) {
            $totals[$ma->alliance_id] = ($totals[$ma->alliance_id] ?? 0) + ($ma->score ?? 0);
        }

        foreach ($match->scores->whereNull('team_id') as $score) {
            if ($score->alliance_id !== null) {
                $totals[$score->alliance_id] = ($totals[$score->alliance_id] ?? 0) + $score->points;
            }
        }

        return $totals;
    }

    /**
     * Start alliance selection by creating alliance groups for top N teams.
     *
     * @return Collection<int, AllianceGroup>
     */
    public function startSelection(int $numberOfAlliances, int $createdBy): Collection
    {
        if ($numberOfAlliances % 2 !== 0) {
            throw new Exception('Number of alliances must be even.');
        }

        $rankings = $this->getRankings();

        if ($rankings->count() < $numberOfAlliances) {
            throw new Exception("Not enough ranked teams. Need at least {$numberOfAlliances} but found {$rankings->count()}.");
        }

        return DB::transaction(function () use ($numberOfAlliances, $createdBy, $rankings) {
            if (AllianceGroup::exists()) {
                throw new Exception('Alliance selection has already been started. Reset first.');
            }

            $groups = collect();

            for ($i = 0; $i < $numberOfAlliances; $i++) {
                $groups->push(AllianceGroup::create([
                    'seed' => $i + 1,
                    'captain_team_id' => $rankings[$i]['team_id'],
                    'picked_team_id' => null,
                    'created_by' => $createdBy,
                    'updated_by' => $createdBy,
                ]));
            }

            return $groups->each(fn (AllianceGroup $g) => $g->load('captainTeam'));
        });
    }

    /**
     * The alliance whose turn it is to pick: the lowest unfilled seed. Returns
     * null when every alliance has picked.
     */
    public function getCurrentPickingGroup(): ?AllianceGroup
    {
        return AllianceGroup::whereNull('picked_team_id')
            ->orderBy('seed')
            ->first();
    }

    /**
     * Invite a team for an alliance group (sets pending).
     */
    public function inviteTeam(int $allianceGroupId, int $teamId, int $updatedBy): AllianceGroup
    {
        return DB::transaction(function () use ($allianceGroupId, $teamId, $updatedBy) {
            $group = AllianceGroup::lockForUpdate()->findOrFail($allianceGroupId);

            if ($group->picked_team_id !== null) {
                throw new Exception('This alliance group has already picked a team.');
            }

            if ($group->pending_team_id !== null) {
                throw new Exception('This alliance group already has a pending invite.');
            }

            $currentSeed = AllianceGroup::whereNull('picked_team_id')->min('seed');
            if ($currentSeed !== null && $group->seed > $currentSeed) {
                throw new Exception("It is alliance #{$currentSeed}'s turn to pick.");
            }

            if (! Team::whereKey($teamId)->exists()) {
                throw new Exception('Team not found.');
            }

            if (AllianceGroup::where('captain_team_id', $teamId)->exists()) {
                throw new Exception('Cannot pick a team that is already a captain.');
            }

            if (AllianceGroup::where('picked_team_id', $teamId)->exists()) {
                throw new Exception('This team has already been picked by another alliance.');
            }

            if (AllianceGroup::where('pending_team_id', $teamId)->exists()) {
                throw new Exception('This team already has a pending invite from another alliance.');
            }

            if (AllianceSelectionDecline::where('team_id', $teamId)->exists()) {
                throw new Exception('This team declined an invitation and is out of alliance selection.');
            }

            $group->update([
                'pending_team_id' => $teamId,
                'updated_by' => $updatedBy,
            ]);

            return $group->load(['captainTeam', 'pickedTeam', 'pendingTeam']);
        });
    }

    /**
     * Accept a pending invite (moves pending → picked).
     */
    public function acceptPick(int $allianceGroupId, int $updatedBy): AllianceGroup
    {
        return DB::transaction(function () use ($allianceGroupId, $updatedBy) {
            $group = AllianceGroup::lockForUpdate()->findOrFail($allianceGroupId);

            if ($group->pending_team_id === null) {
                throw new Exception('No pending invite to accept.');
            }

            $group->update([
                'picked_team_id' => $group->pending_team_id,
                'pending_team_id' => null,
                'updated_by' => $updatedBy,
            ]);

            return $group->load(['captainTeam', 'pickedTeam', 'pendingTeam']);
        });
    }

    /**
     * Decline a pending invite. Per FTC selection rules a team that declines is
     * out of selection entirely — it cannot be invited again by anyone.
     */
    public function declinePick(int $allianceGroupId, int $updatedBy): AllianceGroup
    {
        return DB::transaction(function () use ($allianceGroupId, $updatedBy) {
            $group = AllianceGroup::lockForUpdate()->findOrFail($allianceGroupId);

            if ($group->pending_team_id === null) {
                throw new Exception('No pending invite to decline.');
            }

            AllianceSelectionDecline::firstOrCreate(
                ['team_id' => $group->pending_team_id],
                ['alliance_group_id' => $group->id, 'created_by' => $updatedBy],
            );

            $group->update([
                'pending_team_id' => null,
                'updated_by' => $updatedBy,
            ]);

            return $group->load(['captainTeam', 'pickedTeam', 'pendingTeam']);
        });
    }

    /**
     * Get all alliance groups with their teams.
     *
     * @return Collection<int, AllianceGroup>
     */
    public function getGroups(): Collection
    {
        return AllianceGroup::with(['captainTeam', 'pickedTeam', 'pendingTeam'])
            ->orderBy('seed')
            ->get();
    }

    /**
     * Teams that declined an invitation and are out of selection.
     *
     * @return Collection<int, Team>
     */
    public function getDeclinedTeams(): Collection
    {
        return Team::whereIn('id', AllianceSelectionDecline::pluck('team_id'))
            ->orderBy('number')
            ->get();
    }

    /**
     * Get teams available for picking (not captain, picked, pending or declined).
     *
     * @return Collection<int, Team>
     */
    public function getAvailableTeams(): Collection
    {
        $excludedIds = AllianceGroup::pluck('captain_team_id')
            ->merge(AllianceGroup::whereNotNull('picked_team_id')->pluck('picked_team_id'))
            ->merge(AllianceGroup::whereNotNull('pending_team_id')->pluck('pending_team_id'))
            ->merge(AllianceSelectionDecline::pluck('team_id'));

        return Team::whereNotIn('id', $excludedIds)->orderBy('number')->get();
    }

    /**
     * Check if all alliance groups have completed their picks.
     */
    public function isComplete(): bool
    {
        if (! AllianceGroup::exists()) {
            return false;
        }

        return AllianceGroup::whereNull('picked_team_id')->doesntExist();
    }

    /**
     * Reset alliance selection.
     *
     * alliance_groups is referenced by elimination_series and match_alliances, so
     * those references have to go first — a bare truncate/delete fails on the
     * foreign key. Resetting selection necessarily resets the bracket built on it.
     */
    public function reset(): void
    {
        DB::transaction(function () {
            $this->eliminationScheduler->reset();

            MatchAlliance::withTrashed()
                ->whereNotNull('alliance_group_id')
                ->update(['alliance_group_id' => null]);

            AllianceSelectionDecline::query()->delete();
            AllianceGroup::query()->delete();
        });
    }
}
