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

it('serves one public display page with what every display type needs', function () {
    auth()->logout();
    CompetitionMatch::factory()->create();

    $this->get('/display?type=pit')->assertOk()->assertInertia(fn ($page) => $page
        ->component('display/index')
        ->where('display.mode', 'blank')
        ->has('rankings')
        ->has('matches', 1)
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
    );
});

it('sends the old pit address to the display with the pit type chosen', function () {
    $this->get('/display/pit')->assertRedirect('/event/testevent/display?type=pit');
});

it('shows a message on the audience displays and keeps the match for posting results later', function () {
    $played = CompetitionMatch::factory()->create(['status' => MatchStatus::COMPLETED]);
    $this->putJson('/api/display', ['mode' => 'preview', 'match_id' => $played->id])->assertOk();

    $this->putJson('/api/display', ['mode' => 'message', 'message' => "Lunch break\nBack at 1:00"])
        ->assertOk()
        ->assertJsonPath('mode', 'message')
        ->assertJsonPath('message', "Lunch break\nBack at 1:00");

    $this->putJson('/api/display', ['mode' => 'results'])->assertOk()->assertJsonPath('match_id', $played->id);
});

it('needs text to show a message', function () {
    $this->putJson('/api/display', ['mode' => 'message'])->assertUnprocessable()->assertJsonValidationErrors('message');
});
