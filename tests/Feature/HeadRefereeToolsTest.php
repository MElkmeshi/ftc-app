<?php

use App\Enums\MatchStatus;
use App\Enums\MatchType;
use App\Enums\UserRole;
use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\MatchNote;
use App\Models\Score;
use App\Models\Team;
use App\Models\User;
use App\Services\MatchControlSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->headReferee = User::factory()->admin()->create(['id' => 1]);
    $this->actingAs($this->headReferee);
    $this->red = Alliance::create(['name' => 'Red Alliance', 'color' => 'red']);

    $this->match = CompetitionMatch::create([
        'number' => 1, 'type' => MatchType::QUALIFICATION, 'status' => MatchStatus::UPCOMING,
        'start_time' => now(), 'created_by' => 1, 'updated_by' => 1,
    ]);
    $this->teams = Team::factory()->count(2)->create();

    foreach ($this->teams as $position => $team) {
        MatchAlliance::create([
            'match_id' => $this->match->id, 'team_id' => $team->id, 'alliance_id' => $this->red->id,
            'alliance_pos' => $position + 1, 'score' => 0, 'created_by' => 1, 'updated_by' => 1,
        ]);
    }
});

it('saves the match control switches and turns the recorded countdown on and off', function () {
    $this->getJson('/api/match-control/settings')->assertOk()->assertJson([
        'live_scoring' => true, 'require_ready' => false, 'referee_tablets' => true, 'flip_alliances' => false, 'recorded_countdown' => false,
    ]);

    $this->putJson('/api/match-control/settings', ['require_ready' => true, 'recorded_countdown' => true, 'active_phase' => 'practice'])
        ->assertOk()
        ->assertJson(['require_ready' => true, 'recorded_countdown' => true, 'active_phase' => 'practice', 'live_scoring' => true]);

    $this->getJson('/api/settings/competition')->assertJsonPath('timing.pre_match_countdown', 3);

    $this->putJson('/api/match-control/settings', ['recorded_countdown' => false])->assertJson(['recorded_countdown' => false, 'require_ready' => true]);
});

it('keeps referees away from the match control switches', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::Referee]))
        ->putJson('/api/match-control/settings', ['live_scoring' => false])
        ->assertForbidden();
});

it('holds the start until every team is ready only when that switch is on', function () {
    app(MatchControlSettings::class)->update(['require_ready' => true]);

    $this->postJson('/api/matches/start', ['match_id' => $this->match->id])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Waiting for pre-match setup: '.$this->teams->pluck('number')->join(', ').'.');

    MatchAlliance::query()->update(['ready' => true]);

    $this->postJson('/api/matches/start', ['match_id' => $this->match->id])->assertOk();
});

it('commits without waiting for tablets when live scoring is off', function () {
    $this->match->update(['status' => MatchStatus::ONGOING, 'started_at' => now()]);

    $this->postJson('/api/matches/end', ['match_id' => $this->match->id])->assertConflict();

    app(MatchControlSettings::class)->update(['live_scoring' => false]);

    $this->postJson('/api/matches/end', ['match_id' => $this->match->id])->assertOk();
});

it('holds a match under review until the head referee clears it', function () {
    $this->match->update(['status' => MatchStatus::ONGOING, 'started_at' => now()]);

    $this->putJson("/api/matches/{$this->match->id}/review", ['required' => true])->assertOk()->assertJsonPath('review_required', true);
    $this->postJson('/api/matches/end', ['match_id' => $this->match->id, 'force' => true])->assertConflict();

    $this->putJson("/api/matches/{$this->match->id}/review", ['required' => false])->assertOk();
    $this->postJson('/api/matches/end', ['match_id' => $this->match->id, 'force' => true])->assertOk();
});

it('commits an unplayed match after its scores were entered by hand', function () {
    $this->postJson("/api/matches/{$this->match->id}/commit")->assertOk()->assertJsonPath('status', 'completed');

    $this->postJson("/api/matches/{$this->match->id}/commit")->assertUnprocessable();
});

it('replays a committed match from zero and keeps the old scores for the history', function () {
    $this->match->update(['status' => MatchStatus::COMPLETED, 'ended_at' => now()]);
    $score = Score::create(['match_id' => $this->match->id, 'team_id' => $this->teams[0]->id, 'alliance_id' => $this->red->id, 'points' => 7, 'created_by' => 1]);
    MatchAlliance::query()->where('team_id', $this->teams[0]->id)->update(['score' => 7, 'ready' => true]);

    $this->postJson("/api/matches/{$this->match->id}/replay")->assertOk()->assertJsonPath('status', 'upcoming');

    expect($this->match->refresh())->status->toBe(MatchStatus::UPCOMING)->ended_at->toBeNull()
        ->and(MatchAlliance::query()->sum('score'))->toEqual(0)
        ->and(MatchAlliance::query()->where('ready', true)->count())->toBe(0)
        ->and(Score::withTrashed()->find($score->id)->trashed())->toBeTrue();

    $this->getJson('/api/matches/loaded')->assertJsonPath('id', $this->match->id);
    $this->postJson("/api/matches/{$this->match->id}/replay")->assertUnprocessable();
});

it('lets the head referee write, list and delete match notes, and nobody else', function () {
    $this->postJson('/api/match-notes', ['match_id' => $this->match->id, 'summary' => 'Robot tipped', 'detail' => 'Fell in auto', 'teams' => [(string) $this->teams[0]->number]])
        ->assertCreated()
        ->assertJsonPath('summary', 'Robot tipped')
        ->assertJsonPath('author.name', $this->headReferee->name);

    $this->postJson('/api/match-notes', ['match_id' => $this->match->id, 'summary' => ''])->assertUnprocessable();

    $note = MatchNote::query()->sole();
    $this->getJson('/api/match-notes')->assertOk()->assertJsonCount(1)->assertJsonPath('0.teams.0', (string) $this->teams[0]->number);

    $this->actingAs(User::factory()->create(['role' => UserRole::Referee]))->getJson('/api/match-notes')->assertForbidden();

    $this->actingAs($this->headReferee)->deleteJson("/api/match-notes/{$note->id}")->assertNoContent();
    expect(MatchNote::query()->count())->toBe(0);
});

it('opens the score edit page for the head referee only', function () {
    $this->get("/event/testevent/matches/{$this->match->id}/edit")->assertOk()->assertInertia(fn ($page) => $page
        ->component('matches/edit')
        ->where('match.id', $this->match->id)
        ->has('scoreTypes'));

    $this->actingAs(User::factory()->create(['role' => UserRole::Referee]))
        ->get("/event/testevent/matches/{$this->match->id}/edit")
        ->assertForbidden();
});

it('enters test mode with throwaway matches that stay out of the practice schedule, and deletes them on leaving', function () {
    Alliance::create(['name' => 'Blue Alliance', 'color' => 'blue']);
    Team::factory()->count(2)->create();

    $this->putJson('/api/match-control/test-mode', ['enabled' => true])->assertOk()->assertJsonPath('test_mode', true);

    expect(CompetitionMatch::query()->tests()->count())->toBe(3)
        ->and(CompetitionMatch::query()->practice()->count())->toBe(0)
        ->and(CompetitionMatch::query()->tests()->first()->matchAlliances()->count())->toBe(4);

    $this->get('/event/testevent/schedule')->assertInertia(fn ($page) => $page->has('matches', 1));
    $this->get('/event/testevent/match-control')->assertInertia(fn ($page) => $page->has('matches', 4));

    $test = CompetitionMatch::query()->tests()->first();
    $this->postJson('/api/matches/start', ['match_id' => $test->id])->assertOk();
    $this->putJson('/api/match-control/test-mode', ['enabled' => false])->assertUnprocessable();
    $this->postJson('/api/matches/cancel', ['match_id' => $test->id])->assertOk();

    $this->putJson('/api/match-control/test-mode', ['enabled' => false])->assertOk()->assertJsonPath('test_mode', false);

    expect(CompetitionMatch::withTrashed()->tests()->count())->toBe(0)
        ->and(CompetitionMatch::query()->count())->toBe(1);
    $this->getJson('/api/matches/loaded')->assertExactJson([]);
});

it('shares the two-minute warning between head referee screens until the next match starts', function () {
    $this->getJson('/api/head-referee/desk')->assertOk()->assertJsonPath('warning_started_at', null);

    $this->putJson('/api/head-referee/warning', ['active' => true])->assertOk();
    expect($this->getJson('/api/head-referee/desk')->json('warning_started_at'))->not->toBeNull();

    $this->postJson('/api/matches/start', ['match_id' => $this->match->id])->assertOk();
    $this->getJson('/api/head-referee/desk')->assertJsonPath('warning_started_at', null);
});

it('keeps notes for each kind of meeting', function () {
    $this->putJson('/api/head-referee/meeting-notes', ['type' => 'driver', 'text' => 'Stay behind the line'])->assertOk();
    $this->putJson('/api/head-referee/meeting-notes', ['type' => 'referee', 'text' => 'Call fouls early'])
        ->assertOk()
        ->assertJsonPath('meeting_notes.driver', 'Stay behind the line')
        ->assertJsonPath('meeting_notes.referee', 'Call fouls early');

    $this->putJson('/api/head-referee/meeting-notes', ['type' => 'lunch', 'text' => 'x'])->assertUnprocessable();
});

it('lets the head referee page control matches only as far as match control allows', function () {
    $this->putJson('/api/match-control/settings', ['hr_control' => 'start'])->assertOk()->assertJsonPath('hr_control', 'start');
    $this->putJson('/api/match-control/settings', ['hr_control' => 'everything'])->assertUnprocessable();
});

it('prints match notes on the head referee tracking and FTA notes reports', function () {
    MatchNote::factory()->create(['match_id' => $this->match->id, 'summary' => 'Late to field', 'teams' => [(string) $this->teams[0]->number]]);

    $this->get('/event/testevent/reports/notes')->assertInertia(fn ($page) => $page->where('notes.0.summary', 'Late to field')->where('notes.0.match.number', 1));
    $this->get('/event/testevent/reports/field-notes')->assertInertia(fn ($page) => $page->where('notes.0.match_id', $this->match->id));
});
