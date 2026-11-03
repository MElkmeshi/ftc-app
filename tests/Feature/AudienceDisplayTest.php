<?php

use App\Enums\MatchStatus;
use App\Enums\UserRole;
use App\Events\AudienceDisplayChanged;
use App\Models\CompetitionMatch;
use App\Models\User;
use App\Services\AudienceDisplay;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::HeadReferee]));
});

it('starts on the event name screen', function () {
    $this->getJson('/api/display')->assertOk()->assertJson(['mode' => 'blank', 'match_id' => null]);
});

it('follows the match through load, start and abort', function () {
    $match = CompetitionMatch::factory()->create(['status' => MatchStatus::UPCOMING]);
    $display = app(AudienceDisplay::class);

    $this->postJson('/api/matches/load', ['match_id' => $match->id])->assertOk();
    expect($display->state())->mode->toBe('preview')->match_id->toBe($match->id);

    $this->postJson('/api/matches/start', ['match_id' => $match->id])->assertOk();
    expect($display->state()['mode'])->toBe('match');

    $this->postJson('/api/matches/cancel', ['match_id' => $match->id])->assertOk();
    expect($display->state()['mode'])->toBe('preview');
});

it('switches modes and tells every display', function () {
    Event::fake([AudienceDisplayChanged::class]);

    $this->putJson('/api/display', ['mode' => 'rankings'])->assertOk()->assertJsonPath('mode', 'rankings');

    Event::assertDispatched(AudienceDisplayChanged::class, fn ($event) => $event->eventCode === 'testevent'
        && $event->display['mode'] === 'rankings'
        && $event->broadcastOn()[0]->name === 'event.testevent.display');
});

it('only posts results for completed matches', function () {
    $upcoming = CompetitionMatch::factory()->create(['status' => MatchStatus::UPCOMING]);
    $played = CompetitionMatch::factory()->create(['status' => MatchStatus::COMPLETED]);

    $this->putJson('/api/display', ['mode' => 'results', 'match_id' => $upcoming->id])->assertUnprocessable();
    $this->putJson('/api/display', ['mode' => 'results', 'match_id' => $played->id])->assertOk()->assertJsonPath('match_id', $played->id);
});

it('does not let referees change the display', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::Referee]))
        ->putJson('/api/display', ['mode' => 'blank'])
        ->assertForbidden();
});

it('serves the audience display publicly with its mode as a live prop', function () {
    auth()->logout();

    $this->get('/display')->assertOk()->assertInertia(fn ($page) => $page
        ->component('display/audience')
        ->where('display.mode', 'blank')
        ->has('rankings')
    );
});

it('redirects the old match display URL to the audience display', function () {
    $this->get('/referee/match-control')->assertRedirect('/event/testevent/display');
});

it('shows match control to head referees with every match', function () {
    CompetitionMatch::factory()->count(2)->create();

    $this->get('/match-control')->assertOk()->assertInertia(fn ($page) => $page
        ->component('match-control/index')
        ->has('matches', 2)
        ->has('displayModes', 7)
    );
});

it('serves the pit display publicly with rankings and the schedule', function () {
    auth()->logout();
    CompetitionMatch::factory()->create();

    $this->get('/display/pit')->assertOk()->assertInertia(fn ($page) => $page
        ->component('display/pit')
        ->has('rankings')
        ->has('matches', 1)
    );
});
