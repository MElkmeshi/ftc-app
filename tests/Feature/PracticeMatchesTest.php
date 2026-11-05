<?php

use App\Enums\MatchStatus;
use App\Enums\MatchType;
use App\Enums\UserRole;
use App\Models\Alliance;
use App\Models\AllianceGroup;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\Team;
use App\Models\User;
use App\Services\AllianceSelectionService;
use App\Services\EliminationScheduler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->admin()->create(['id' => 1]);
    Alliance::create(['name' => 'Red Alliance', 'color' => 'red']);
    Alliance::create(['name' => 'Blue Alliance', 'color' => 'blue']);
    $this->teams = Team::factory()->count(4)->create();
});

function generatePractice(array $overrides = [])
{
    return test()->actingAs(test()->admin)->postJson('/api/event/testevent/matches/practice', [
        'matches_per_team' => 1,
        'teams_per_alliance' => 2,
        'first_match_at' => '2026-11-06T08:00',
        'cycle_minutes' => 5,
        ...$overrides,
    ]);
}

function generateQualifications()
{
    return test()->actingAs(test()->admin)->postJson('/api/event/testevent/matches/generate-schedule', ['matches_per_team' => 2, 'teams_per_alliance' => 2]);
}

it('builds practice matches with their own numbers and times, beside the qualification schedule', function () {
    generateQualifications()->assertOk();
    $qualificationIds = CompetitionMatch::query()->qualification()->pluck('id')->all();

    generatePractice(['matches_per_team' => 2])->assertOk();

    $practice = CompetitionMatch::query()->practice()->orderBy('number')->get();
    $timezone = $this->event->timezone;

    expect($practice->pluck('number')->all())->toBe([1, 2])
        ->and($practice->map(fn ($match) => $match->start_time->setTimezone($timezone)->format('H:i'))->all())->toBe(['08:00', '08:05'])
        ->and(CompetitionMatch::query()->qualification()->pluck('id')->all())->toBe($qualificationIds)
        ->and(CompetitionMatch::query()->inPlayOrder()->first()->type)->toBe(MatchType::PRACTICE);
});

it('keeps practice matches when the qualification schedule is generated again', function () {
    generatePractice()->assertOk();
    $practiceIds = CompetitionMatch::query()->practice()->pluck('id')->all();

    generateQualifications()->assertOk();
    generateQualifications()->assertOk();

    expect(CompetitionMatch::query()->practice()->pluck('id')->all())->toBe($practiceIds)
        ->and(CompetitionMatch::query()->qualification()->min('number'))->toBe(1);
});

it('leaves practice results out of the rankings', function () {
    generatePractice()->assertOk();
    $match = CompetitionMatch::query()->practice()->first();
    $match->update(['status' => MatchStatus::COMPLETED]);
    $match->matchAlliances()->first()->update(['score' => 99]);

    expect(app(AllianceSelectionService::class)->getRankings())->toBeEmpty();
});

it('numbers playoff matches after the qualifications, not the practice matches', function () {
    generatePractice(['matches_per_team' => 3])->assertOk();
    CompetitionMatch::factory()->create(['type' => MatchType::QUALIFICATION, 'number' => 1, 'status' => MatchStatus::COMPLETED]);
    foreach ([0, 1] as $seed) {
        AllianceGroup::create(['seed' => $seed + 1, 'captain_team_id' => $this->teams[$seed * 2]->id, 'picked_team_id' => $this->teams[$seed * 2 + 1]->id, 'created_by' => 1, 'updated_by' => 1]);
    }

    app(EliminationScheduler::class)->generate(1);

    expect(CompetitionMatch::query()->elimination()->orderBy('number')->pluck('number')->all())->toBe([2, 3]);
});

it('will not replace or delete the practice schedule while a practice match is running', function () {
    generatePractice()->assertOk();
    CompetitionMatch::query()->practice()->first()->update(['status' => MatchStatus::ONGOING]);

    generatePractice()->assertUnprocessable();
    $this->actingAs($this->admin)->deleteJson('/api/event/testevent/matches/practice')->assertUnprocessable();

    expect(CompetitionMatch::query()->practice()->count())->toBe(1);
});

it('deletes only the practice matches', function () {
    generateQualifications()->assertOk();
    generatePractice()->assertOk();

    $this->actingAs($this->admin)->deleteJson('/api/event/testevent/matches/practice')->assertOk();

    expect(CompetitionMatch::query()->practice()->count())->toBe(0)
        ->and(MatchAlliance::query()->whereDoesntHave('match')->count())->toBe(0)
        ->and(CompetitionMatch::query()->qualification()->count())->toBeGreaterThan(0);
});

it('keeps the practice schedule to admins', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::HeadReferee]))
        ->postJson('/api/event/testevent/matches/practice', ['matches_per_team' => 1, 'teams_per_alliance' => 2, 'first_match_at' => '2026-11-06T08:00', 'cycle_minutes' => 5])
        ->assertForbidden();
});

it('reports how many practice matches each team has played and has left', function () {
    Carbon::setTestNow('2026-11-06 07:00');
    generatePractice(['matches_per_team' => 2])->assertOk();
    $first = CompetitionMatch::query()->practice()->orderBy('number')->first();
    $first->update(['status' => MatchStatus::COMPLETED]);
    $playedTeamId = $first->matchAlliances()->value('team_id');

    $this->actingAs($this->admin)->get('/event/testevent/reports/practice')->assertInertia(fn ($page) => $page
        ->component('reports/practice')
        ->has('teams', 4)
        ->where('teams', fn ($rows) => collect($rows)->firstWhere('team.id', $playedTeamId)['played'] === 1
            && collect($rows)->firstWhere('team.id', $playedTeamId)['remaining'] === 1)
    );
});
