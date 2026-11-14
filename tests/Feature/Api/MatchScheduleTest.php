<?php

use App\Events\EliminationBracketUpdated;
use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\Score;
use App\Models\ScoreType;
use App\Models\Team;
use App\Models\User;
use App\Services\AllianceSelectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->admin()->create(['id' => 1]);
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

it('does not count the extra match a team plays to fill the schedule for ranking', function () {
    Team::factory()->count(5)->create();

    $this->postJson('/api/matches/generate-schedule', ['matches_per_team' => 3, 'teams_per_alliance' => 2])->assertSuccessful();

    $seats = MatchAlliance::all()->groupBy('team_id');

    expect($seats->map->count()->max())->toBeGreaterThan(3)
        ->and($seats->map(fn ($teamSeats) => $teamSeats->where('counts_for_ranking', true)->count())->unique()->values()->all())->toBe([3]);
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
    Event::fake([EliminationBracketUpdated::class]);
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
    Event::assertDispatched(EliminationBracketUpdated::class);
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

it('uses the same ranking totals for selection and the public display and skips withdrawn teams', function () {
    $match = CompetitionMatch::factory()->create(['status' => 'completed', 'type' => 'qualification']);
    $teams = Team::factory()->count(2)->create();
    foreach ($teams as $position => $team) {
        MatchAlliance::create([
            'match_id' => $match->id, 'team_id' => $team->id, 'alliance_id' => 1,
            'alliance_pos' => $position + 1, 'score' => 20, 'created_by' => 1,
        ]);
    }
    $type = ScoreType::factory()->create(['points' => 5, 'target' => 'alliance']);
    $match->scores()->create(['alliance_id' => 1, 'score_type_id' => $type->id, 'created_by' => 1]);
    Team::query()->whereKey($teams->last()->id)->update(['deleted_at' => now()]);

    $display = $this->getJson('/api/matches/teams-display')->assertSuccessful()->json();
    expect($display)->toHaveCount(1);
    expect($display[0]['team_score'])->toBe(20);
    expect($display[0]['alliance_score'])->toBe(5);
    expect($display[0]['total_score'])->toBe(25);
    expect($display)->toBe(app(AllianceSelectionService::class)->getRankings()->all());
});
