<?php

use App\Enums\MatchStatus;
use App\Enums\MatchType;
use App\Models\Alliance;
use App\Models\AllianceGroup;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\Team;
use App\Models\User;
use App\Services\AllianceSelectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->create(['id' => 1]);

    if (Alliance::count() < 2) {
        Alliance::create(['name' => 'Red Alliance', 'color' => 'red']);
        Alliance::create(['name' => 'Blue Alliance', 'color' => 'blue']);
    }
});

function createCompletedQualificationMatch(int $team1Id, int $team2Id, int $team1Score, int $team2Score, int $matchNumber): void
{
    $alliances = Alliance::orderBy('id')->get();

    $match = CompetitionMatch::create([
        'number' => $matchNumber,
        'type' => MatchType::QUALIFICATION,
        'status' => MatchStatus::COMPLETED,
        'start_time' => now(),
        'started_at' => now(),
        'ended_at' => now(),
        'created_by' => 1,
        'updated_by' => 1,
    ]);

    MatchAlliance::create([
        'match_id' => $match->id,
        'team_id' => $team1Id,
        'alliance_id' => $alliances[0]->id,
        'alliance_pos' => 1,
        'score' => $team1Score,
        'created_by' => 1,
        'updated_by' => 1,
    ]);

    MatchAlliance::create([
        'match_id' => $match->id,
        'team_id' => $team2Id,
        'alliance_id' => $alliances[1]->id,
        'alliance_pos' => 1,
        'score' => $team2Score,
        'created_by' => 1,
        'updated_by' => 1,
    ]);
}

it('ranks teams correctly from qualification matches', function () {
    $teams = Team::factory()->count(4)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = new AllianceSelectionService;
    $rankings = $service->getRankings();

    expect($rankings)->toHaveCount(4);
    // Team with 120 should be first, then 100, then 80, then 50
    expect($rankings[0]['team_id'])->toBe($teams[3]->id);
    expect($rankings[0]['total_score'])->toBe(120);
    expect($rankings[1]['team_id'])->toBe($teams[0]->id);
    expect($rankings[1]['total_score'])->toBe(100);
});

it('creates alliance groups for top N teams', function () {
    $teams = Team::factory()->count(4)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = new AllianceSelectionService;
    $groups = $service->startSelection(2, 1);

    expect($groups)->toHaveCount(2);
    expect(AllianceGroup::count())->toBe(2);

    // Seed 1 should be team with highest score (120)
    $group1 = AllianceGroup::where('seed', 1)->first();
    expect($group1->captain_team_id)->toBe($teams[3]->id);

    // Seed 2 should be team with second highest score (100)
    $group2 = AllianceGroup::where('seed', 2)->first();
    expect($group2->captain_team_id)->toBe($teams[0]->id);
});

it('invite sets pending_team_id', function () {
    $teams = Team::factory()->count(4)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = new AllianceSelectionService;
    $service->startSelection(2, 1);

    $group1 = AllianceGroup::where('seed', 1)->first();
    $availableTeam = $teams[2]; // score 80, not a captain

    $result = $service->inviteTeam($group1->id, $availableTeam->id, 1);

    expect($result->pending_team_id)->toBe($availableTeam->id);
    expect($result->picked_team_id)->toBeNull();
});

it('accept moves pending to picked', function () {
    $teams = Team::factory()->count(4)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = new AllianceSelectionService;
    $service->startSelection(2, 1);

    $group1 = AllianceGroup::where('seed', 1)->first();
    $availableTeam = $teams[2];

    $service->inviteTeam($group1->id, $availableTeam->id, 1);
    $result = $service->acceptPick($group1->id, 1);

    expect($result->picked_team_id)->toBe($availableTeam->id);
    expect($result->pending_team_id)->toBeNull();
});

it('decline clears pending', function () {
    $teams = Team::factory()->count(4)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = new AllianceSelectionService;
    $service->startSelection(2, 1);

    $group1 = AllianceGroup::where('seed', 1)->first();
    $availableTeam = $teams[2];

    $service->inviteTeam($group1->id, $availableTeam->id, 1);
    $result = $service->declinePick($group1->id, 1);

    expect($result->pending_team_id)->toBeNull();
    expect($result->picked_team_id)->toBeNull();
});

it('cannot invite when already has a pending invite', function () {
    $teams = Team::factory()->count(4)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = new AllianceSelectionService;
    $service->startSelection(2, 1);

    $group1 = AllianceGroup::where('seed', 1)->first();

    $service->inviteTeam($group1->id, $teams[2]->id, 1);

    expect(fn () => $service->inviteTeam($group1->id, $teams[1]->id, 1))
        ->toThrow(Exception::class, 'This alliance group already has a pending invite.');
});

it('cannot invite a team that is pending for another alliance', function () {
    $teams = Team::factory()->count(4)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = new AllianceSelectionService;
    $service->startSelection(2, 1);

    $group1 = AllianceGroup::where('seed', 1)->first();
    $group2 = AllianceGroup::where('seed', 2)->first();

    $service->inviteTeam($group1->id, $teams[2]->id, 1);

    expect(fn () => $service->inviteTeam($group2->id, $teams[2]->id, 1))
        ->toThrow(Exception::class, 'This team already has a pending invite from another alliance.');
});

it('prevents inviting a team that is already a captain', function () {
    $teams = Team::factory()->count(4)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = new AllianceSelectionService;
    $service->startSelection(2, 1);

    $group1 = AllianceGroup::where('seed', 1)->first();
    $group2 = AllianceGroup::where('seed', 2)->first();

    expect(fn () => $service->inviteTeam($group1->id, $group2->captain_team_id, 1))
        ->toThrow(Exception::class, 'Cannot pick a team that is already a captain.');
});

it('prevents inviting a team that is already picked', function () {
    $teams = Team::factory()->count(4)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = new AllianceSelectionService;
    $service->startSelection(2, 1);

    $group1 = AllianceGroup::where('seed', 1)->first();
    $group2 = AllianceGroup::where('seed', 2)->first();

    // Invite and accept for group 1
    $service->inviteTeam($group1->id, $teams[1]->id, 1);
    $service->acceptPick($group1->id, 1);

    // Try to invite the same team for group 2
    expect(fn () => $service->inviteTeam($group2->id, $teams[1]->id, 1))
        ->toThrow(Exception::class, 'This team has already been picked by another alliance.');
});

it('available teams excludes pending teams', function () {
    $teams = Team::factory()->count(4)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = new AllianceSelectionService;
    $service->startSelection(2, 1);

    $group1 = AllianceGroup::where('seed', 1)->first();

    // Before invite: 2 available (4 teams - 2 captains)
    expect($service->getAvailableTeams())->toHaveCount(2);

    $service->inviteTeam($group1->id, $teams[2]->id, 1);

    // After invite: 1 available (pending team excluded)
    $available = $service->getAvailableTeams();
    expect($available)->toHaveCount(1);
    expect($available->pluck('id')->all())->not->toContain($teams[2]->id);
});

it('returns correct available teams', function () {
    $teams = Team::factory()->count(4)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = new AllianceSelectionService;
    $service->startSelection(2, 1);

    // After selection start, captains should be excluded
    $available = $service->getAvailableTeams();
    $captainIds = AllianceGroup::pluck('captain_team_id')->all();

    foreach ($available as $team) {
        expect($captainIds)->not->toContain($team->id);
    }

    expect($available)->toHaveCount(2); // 4 teams - 2 captains = 2 available
});

it('detects selection completion', function () {
    $teams = Team::factory()->count(4)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = new AllianceSelectionService;
    $service->startSelection(2, 1);

    expect($service->isComplete())->toBeFalse();

    $groups = AllianceGroup::orderBy('seed')->get();
    $available = $service->getAvailableTeams();

    $service->inviteTeam($groups[0]->id, $available[0]->id, 1);
    $service->acceptPick($groups[0]->id, 1);
    expect($service->isComplete())->toBeFalse();

    $available = $service->getAvailableTeams();
    $service->inviteTeam($groups[1]->id, $available[0]->id, 1);
    $service->acceptPick($groups[1]->id, 1);
    expect($service->isComplete())->toBeTrue();
});

it('rejects odd number of alliances', function () {
    $teams = Team::factory()->count(4)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = new AllianceSelectionService;

    expect(fn () => $service->startSelection(3, 1))
        ->toThrow(Exception::class, 'Number of alliances must be even.');
});

it('rejects starting selection twice', function () {
    $teams = Team::factory()->count(4)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = new AllianceSelectionService;
    $service->startSelection(2, 1);

    expect(fn () => $service->startSelection(2, 1))
        ->toThrow(Exception::class, 'Alliance selection has already been started.');
});
