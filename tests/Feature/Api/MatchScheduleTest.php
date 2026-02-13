<?php

use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\Score;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->create(['id' => 1]);
    $this->actingAs(User::find(1));

    Alliance::create(['id' => 1, 'color' => 'red']);
    Alliance::create(['id' => 2, 'color' => 'blue']);
});

it('generates a match schedule', function () {
    Team::factory()->count(4)->create();

    $response = $this->postJson('/api/matches/generate-schedule', [
        'matches_per_team' => 2,
        'teams_per_alliance' => 1,
    ]);

    $response->assertSuccessful();
    expect(CompetitionMatch::count())->toBeGreaterThan(0);
    expect(MatchAlliance::count())->toBeGreaterThan(0);
});

it('generates a schedule with max scoring matches', function () {
    Team::factory()->count(6)->create();

    $response = $this->postJson('/api/matches/generate-schedule', [
        'matches_per_team' => 4,
        'teams_per_alliance' => 2,
        'max_scoring_matches' => 2,
    ]);

    $response->assertSuccessful();

    $teams = Team::all();
    foreach ($teams as $team) {
        $rankingCount = MatchAlliance::where('team_id', $team->id)
            ->where('counts_for_ranking', true)
            ->count();

        expect($rankingCount)->toBeLessThanOrEqual(2);
    }
});

it('validates required fields for schedule generation', function () {
    $response = $this->postJson('/api/matches/generate-schedule', []);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['matches_per_team', 'teams_per_alliance']);
});

it('returns error when no teams exist', function () {
    $response = $this->postJson('/api/matches/generate-schedule', [
        'matches_per_team' => 2,
        'teams_per_alliance' => 1,
    ]);

    $response->assertStatus(422);
    expect($response->json('message'))->toContain('No teams');
});

it('deletes all matches and related data', function () {
    $team1 = Team::factory()->create();
    $team2 = Team::factory()->create();

    $match = CompetitionMatch::factory()->create();
    MatchAlliance::create([
        'match_id' => $match->id,
        'team_id' => $team1->id,
        'alliance_id' => 1,
        'alliance_pos' => 1,
        'score' => 10,
        'created_by' => 1,
        'updated_by' => 1,
    ]);

    $response = $this->deleteJson('/api/matches/delete-all');

    $response->assertSuccessful();
    expect(CompetitionMatch::count())->toBe(0);
    expect(MatchAlliance::count())->toBe(0);
    expect(Score::count())->toBe(0);
});

it('returns dashboard stats', function () {
    Team::factory()->count(3)->create();
    CompetitionMatch::factory()->count(2)->create(['status' => 'completed']);
    CompetitionMatch::factory()->create(['status' => 'upcoming']);

    $response = $this->getJson('/api/dashboard/stats');

    $response->assertSuccessful();
    expect($response->json('total_teams'))->toBe(3);
    expect($response->json('total_matches'))->toBe(3);
    expect($response->json('completed_matches'))->toBe(2);
    expect($response->json('ongoing_match'))->toBeNull();
});

it('returns ongoing match in dashboard stats', function () {
    $match = CompetitionMatch::factory()->create([
        'status' => 'ongoing',
        'started_at' => now(),
    ]);

    $response = $this->getJson('/api/dashboard/stats');

    $response->assertSuccessful();
    expect($response->json('ongoing_match.id'))->toBe($match->id);
    expect($response->json('ongoing_match.number'))->toBe($match->number);
});
