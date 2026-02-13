<?php

namespace App\Services;

use App\Enums\MatchStatus;
use App\Models\AllianceGroup;
use App\Models\CompetitionMatch;
use App\Models\Team;
use Exception;
use Illuminate\Support\Collection;

class AllianceSelectionService
{
    /**
     * Get team rankings from completed qualification matches.
     *
     * @return Collection<int, array{team_id: int, team_number: string, team_name: string, total_score: int, rank: int}>
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
            foreach ($match->matchAlliances as $ma) {
                if (! $ma->counts_for_ranking) {
                    continue;
                }

                $teamId = $ma->team->id;

                if (! isset($teamScores[$teamId])) {
                    $teamScores[$teamId] = [
                        'team_id' => $ma->team->id,
                        'team_number' => $ma->team->number,
                        'team_name' => $ma->team->name,
                        'total_score' => 0,
                    ];
                }

                $teamScores[$teamId]['total_score'] += $ma->score;

                $allianceWideScore = $match->scores
                    ->where('alliance_id', $ma->alliance_id)
                    ->whereNull('team_id')
                    ->sum(fn ($score) => $score->scoreType->points ?? 0);

                $teamScores[$teamId]['total_score'] += $allianceWideScore;
            }
        }

        return collect($teamScores)
            ->sortByDesc('total_score')
            ->values()
            ->map(function ($team, $index) {
                $team['rank'] = $index + 1;

                return $team;
            });
    }

    /**
     * Start alliance selection by creating alliance groups for top N teams.
     */
    public function startSelection(int $numberOfAlliances, int $createdBy): Collection
    {
        if ($numberOfAlliances % 2 !== 0) {
            throw new Exception('Number of alliances must be even.');
        }

        if (AllianceGroup::exists()) {
            throw new Exception('Alliance selection has already been started. Reset first.');
        }

        $rankings = $this->getRankings();

        if ($rankings->count() < $numberOfAlliances) {
            throw new Exception("Not enough ranked teams. Need at least {$numberOfAlliances} but found {$rankings->count()}.");
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
    }

    /**
     * Invite a team for an alliance group (sets pending).
     */
    public function inviteTeam(int $allianceGroupId, int $teamId, int $updatedBy): AllianceGroup
    {
        $group = AllianceGroup::findOrFail($allianceGroupId);

        if ($group->picked_team_id !== null) {
            throw new Exception('This alliance group has already picked a team.');
        }

        if ($group->pending_team_id !== null) {
            throw new Exception('This alliance group already has a pending invite.');
        }

        $isCaptain = AllianceGroup::where('captain_team_id', $teamId)->exists();
        if ($isCaptain) {
            throw new Exception('Cannot pick a team that is already a captain.');
        }

        $isPicked = AllianceGroup::where('picked_team_id', $teamId)->exists();
        if ($isPicked) {
            throw new Exception('This team has already been picked by another alliance.');
        }

        $isPending = AllianceGroup::where('pending_team_id', $teamId)->exists();
        if ($isPending) {
            throw new Exception('This team already has a pending invite from another alliance.');
        }

        $teamExists = Team::where('id', $teamId)->exists();
        if (! $teamExists) {
            throw new Exception('Team not found.');
        }

        $group->update([
            'pending_team_id' => $teamId,
            'updated_by' => $updatedBy,
        ]);

        return $group->load(['captainTeam', 'pickedTeam', 'pendingTeam']);
    }

    /**
     * Accept a pending invite (moves pending → picked).
     */
    public function acceptPick(int $allianceGroupId, int $updatedBy): AllianceGroup
    {
        $group = AllianceGroup::findOrFail($allianceGroupId);

        if ($group->pending_team_id === null) {
            throw new Exception('No pending invite to accept.');
        }

        $group->update([
            'picked_team_id' => $group->pending_team_id,
            'pending_team_id' => null,
            'updated_by' => $updatedBy,
        ]);

        return $group->load(['captainTeam', 'pickedTeam', 'pendingTeam']);
    }

    /**
     * Decline a pending invite (clears pending).
     */
    public function declinePick(int $allianceGroupId, int $updatedBy): AllianceGroup
    {
        $group = AllianceGroup::findOrFail($allianceGroupId);

        if ($group->pending_team_id === null) {
            throw new Exception('No pending invite to decline.');
        }

        $group->update([
            'pending_team_id' => null,
            'updated_by' => $updatedBy,
        ]);

        return $group->load(['captainTeam', 'pickedTeam', 'pendingTeam']);
    }

    /**
     * Get all alliance groups with their teams.
     */
    public function getGroups(): Collection
    {
        return AllianceGroup::with(['captainTeam', 'pickedTeam', 'pendingTeam'])
            ->orderBy('seed')
            ->get();
    }

    /**
     * Get teams available for picking (not captain or already picked).
     */
    public function getAvailableTeams(): Collection
    {
        $captainIds = AllianceGroup::pluck('captain_team_id');
        $pickedIds = AllianceGroup::whereNotNull('picked_team_id')->pluck('picked_team_id');
        $pendingIds = AllianceGroup::whereNotNull('pending_team_id')->pluck('pending_team_id');

        $excludedIds = $captainIds->merge($pickedIds)->merge($pendingIds);

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
     * Reset alliance selection (delete all alliance groups).
     */
    public function reset(): void
    {
        AllianceGroup::truncate();
    }
}
