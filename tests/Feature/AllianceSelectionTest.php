<?php

use App\Enums\MatchStatus;
use App\Enums\MatchType;
use App\Enums\RankingMethod;
use App\Models\Alliance;
use App\Models\AllianceGroup;
use App\Models\AllianceSelectionDecline;
use App\Models\CompetitionMatch;
use App\Models\EliminationSeries;
use App\Models\MatchAlliance;
use App\Models\Team;
use App\Models\User;
use App\Services\AllianceSelectionService;
use App\Services\EliminationScheduler;
use Illuminate\Database\QueryException;
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

    $service = app(AllianceSelectionService::class);
    $rankings = $service->getRankings();

    expect($rankings)->toHaveCount(4);
    // Team with 120 should be first, then 100, then 80, then 50
    expect($rankings[0]['team_id'])->toBe($teams[3]->id);
    expect($rankings[0]['total_score'])->toBe(120);
    expect($rankings[1]['team_id'])->toBe($teams[0]->id);
    expect($rankings[1]['total_score'])->toBe(100);
});

it('ranks by win/loss record when the event uses FTC-style rankings', function () {
    $this->event->game->update(['ranking_method' => RankingMethod::Record]);
    $teams = Team::factory()->count(3)->create();

    // Team 0 wins twice by small margins; team 1 scores big but loses once.
    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 60, 50, 1);
    createCompletedQualificationMatch($teams[0]->id, $teams[2]->id, 30, 10, 2);
    createCompletedQualificationMatch($teams[1]->id, $teams[2]->id, 200, 200, 3);

    $rankings = app(AllianceSelectionService::class)->getRankings();

    expect($rankings[0])
        ->team_id->toBe($teams[0]->id)
        ->wins->toBe(2)->losses->toBe(0)
        ->ranking_points->toBe(2)
        ->average_score->toBe(45);

    expect($rankings[1])
        ->team_id->toBe($teams[1]->id)
        ->ties->toBe(1)->losses->toBe(1)
        ->ranking_points->toBe(0.5)
        ->highest_score->toBe(200);
});

it('creates alliance groups for top N teams', function () {
    $teams = Team::factory()->count(4)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = app(AllianceSelectionService::class);
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

    $service = app(AllianceSelectionService::class);
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

    $service = app(AllianceSelectionService::class);
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

    $service = app(AllianceSelectionService::class);
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

    $service = app(AllianceSelectionService::class);
    $service->startSelection(2, 1);

    $group1 = AllianceGroup::where('seed', 1)->first();

    $service->inviteTeam($group1->id, $teams[2]->id, 1);

    expect(fn () => $service->inviteTeam($group1->id, $teams[1]->id, 1))
        ->toThrow(Exception::class, 'This alliance group already has a pending invite.');
});

it('cannot invite a team that is pending for another alliance', function () {
    $teams = Team::factory()->count(6)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = app(AllianceSelectionService::class);
    $service->startSelection(2, 1);

    $group1 = AllianceGroup::where('seed', 1)->first();
    $group2 = AllianceGroup::where('seed', 2)->first();

    // Seed 1 takes its turn first so seed 2 is legitimately on the clock.
    $service->inviteTeam($group1->id, $teams[4]->id, 1);
    $service->acceptPick($group1->id, 1);

    // Force a pending invite onto seed 1 behind the service's back so the
    // duplicate-team guard is the only thing standing between the two picks.
    $group1->update(['pending_team_id' => $teams[5]->id]);

    expect(fn () => $service->inviteTeam($group2->id, $teams[5]->id, 1))
        ->toThrow(Exception::class, 'This team already has a pending invite from another alliance.');
});

it('prevents inviting a team that is already a captain', function () {
    $teams = Team::factory()->count(4)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = app(AllianceSelectionService::class);
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

    $service = app(AllianceSelectionService::class);
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

    $service = app(AllianceSelectionService::class);
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

    $service = app(AllianceSelectionService::class);
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

    $service = app(AllianceSelectionService::class);
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

    $service = app(AllianceSelectionService::class);

    expect(fn () => $service->startSelection(3, 1))
        ->toThrow(Exception::class, 'Number of alliances must be even.');
});

it('rejects starting selection twice', function () {
    $teams = Team::factory()->count(4)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = app(AllianceSelectionService::class);
    $service->startSelection(2, 1);

    expect(fn () => $service->startSelection(2, 1))
        ->toThrow(Exception::class, 'Alliance selection has already been started.');
});

it('accepts 8 alliances when enough teams have played', function () {
    $teams = Team::factory()->count(16)->create();

    for ($i = 0; $i < 8; $i++) {
        createCompletedQualificationMatch($teams[$i * 2]->id, $teams[$i * 2 + 1]->id, 100 - $i, 90 - $i, $i + 1);
    }

    $groups = app(AllianceSelectionService::class)->startSelection(8, 1);

    expect($groups)->toHaveCount(8)
        ->and(AllianceGroup::count())->toBe(8);
});

it('breaks ranking ties deterministically by team number', function () {
    $teams = collect(['2001', '1002', '3003', '0004'])
        ->map(fn (string $number) => Team::factory()->create(['number' => $number]));

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 50, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 50, 50, 2);

    $rankings = app(AllianceSelectionService::class)->getRankings();

    expect($rankings->pluck('team_number')->all())->toBe([4, 1002, 2001, 3003]);
});

it('still ranks remaining teams when a team that played quals is deleted', function () {
    $teams = Team::factory()->count(4)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $teams[3]->delete();

    $rankings = app(AllianceSelectionService::class)->getRankings();

    expect($rankings)->toHaveCount(3)
        ->and($rankings->pluck('team_id'))->not->toContain($teams[3]->id)
        ->and($rankings[0]['team_id'])->toBe($teams[0]->id);
});

it('enforces pick order by seed', function () {
    $teams = Team::factory()->count(6)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = app(AllianceSelectionService::class);
    $service->startSelection(2, 1);

    $group1 = AllianceGroup::where('seed', 1)->first();
    $group2 = AllianceGroup::where('seed', 2)->first();

    expect(fn () => $service->inviteTeam($group2->id, $teams[4]->id, 1))
        ->toThrow(Exception::class, "It is alliance #1's turn to pick.");

    $service->inviteTeam($group1->id, $teams[4]->id, 1);
    $service->acceptPick($group1->id, 1);

    expect($service->inviteTeam($group2->id, $teams[5]->id, 1)->pending_team_id)
        ->toBe($teams[5]->id);
});

it('reports which alliance is on the clock', function () {
    $teams = Team::factory()->count(6)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = app(AllianceSelectionService::class);
    $service->startSelection(2, 1);

    expect($service->getCurrentPickingGroup()->seed)->toBe(1);

    $group1 = AllianceGroup::where('seed', 1)->first();
    $service->inviteTeam($group1->id, $teams[4]->id, 1);
    $service->acceptPick($group1->id, 1);

    expect($service->getCurrentPickingGroup()->seed)->toBe(2);

    $group2 = AllianceGroup::where('seed', 2)->first();
    $service->inviteTeam($group2->id, $teams[5]->id, 1);
    $service->acceptPick($group2->id, 1);

    expect($service->getCurrentPickingGroup())->toBeNull();
});

it('removes a declining team from selection entirely', function () {
    $teams = Team::factory()->count(6)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = app(AllianceSelectionService::class);
    $service->startSelection(2, 1);

    $group1 = AllianceGroup::where('seed', 1)->first();
    $service->inviteTeam($group1->id, $teams[4]->id, 1);
    $service->declinePick($group1->id, 1);

    expect($service->getDeclinedTeams()->pluck('id')->all())->toBe([$teams[4]->id])
        ->and($service->getAvailableTeams()->pluck('id'))->not->toContain($teams[4]->id);

    expect(fn () => $service->inviteTeam($group1->id, $teams[4]->id, 1))
        ->toThrow(Exception::class, 'This team declined an invitation and is out of alliance selection.');
});

it('resets cleanly after an elimination bracket has been generated', function () {
    $teams = Team::factory()->count(8)->create();

    for ($i = 0; $i < 4; $i++) {
        createCompletedQualificationMatch($teams[$i * 2]->id, $teams[$i * 2 + 1]->id, 100 - $i * 10, 90 - $i * 10, $i + 1);
    }

    $service = app(AllianceSelectionService::class);
    $service->startSelection(4, 1);

    foreach (AllianceGroup::orderBy('seed')->get() as $group) {
        $service->inviteTeam($group->id, $service->getAvailableTeams()->first()->id, 1);
        $service->acceptPick($group->id, 1);
    }

    app(EliminationScheduler::class)->generate(1);
    expect(EliminationSeries::count())->toBeGreaterThan(0);

    $service->reset();

    expect(AllianceGroup::count())->toBe(0)
        ->and(EliminationSeries::count())->toBe(0)
        ->and(AllianceSelectionDecline::count())->toBe(0)
        ->and(CompetitionMatch::elimination()->count())->toBe(0);
});

it('reset also clears declines', function () {
    $teams = Team::factory()->count(6)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    $service = app(AllianceSelectionService::class);
    $service->startSelection(2, 1);

    $group1 = AllianceGroup::where('seed', 1)->first();
    $service->inviteTeam($group1->id, $teams[4]->id, 1);
    $service->declinePick($group1->id, 1);

    $service->reset();

    expect(AllianceSelectionDecline::count())->toBe(0);
});

it('refuses to seat the same team twice at the database level', function () {
    $teams = Team::factory()->count(4)->create();

    createCompletedQualificationMatch($teams[0]->id, $teams[1]->id, 100, 50, 1);
    createCompletedQualificationMatch($teams[2]->id, $teams[3]->id, 80, 120, 2);

    app(AllianceSelectionService::class)->startSelection(2, 1);

    $group1 = AllianceGroup::where('seed', 1)->first();
    $group2 = AllianceGroup::where('seed', 2)->first();

    $group1->update(['pending_team_id' => $teams[2]->id]);

    // Simulates two operators inviting the same team concurrently, bypassing
    // the service guards — the unique index has to be the one that says no.
    expect(fn () => $group2->update(['pending_team_id' => $teams[2]->id]))
        ->toThrow(QueryException::class);
});
