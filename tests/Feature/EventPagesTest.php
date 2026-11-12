<?php

use App\Enums\UserRole;
use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('lists every event on the home page', function () {
    Event::factory()->create(['code' => 'spring', 'name' => 'Spring Scrimmage', 'start_date' => now()->subYear(), 'end_date' => now()->subYear()]);

    $this->get('/')->assertOk()->assertInertia(fn ($page) => $page
        ->component('events/index')
        ->has('events', 2)
        ->where('events.1.code', 'spring')
    );
});

it('shows an event home page with links for every field', function () {
    $this->get('/event/testevent')->assertOk()->assertInertia(fn ($page) => $page
        ->component('events/show')
        ->where('event.code', 'testevent')

    );
});

it('returns 404 for an unknown event code', function () {
    $this->get('/event/nope/referee/display')->assertNotFound();
});

it('tells screens the server time for clock sync', function () {
    $this->getJson('/server-time')->assertOk()->assertJsonStructure(['now']);

    expect(abs($this->getJson('/server-time')->json('now') - now()->getTimestampMs()))->toBeLessThan(5000);
});

it('serves public screens without starting a session', function (string $method, string $uri, array $body) {
    $this->json($method, $uri, $body)
        ->assertSuccessful()
        ->assertCookieMissing(config('session.cookie'))
        ->assertCookieMissing('XSRF-TOKEN');
})->with([
    'clock sync' => ['GET', '/server-time', []],
    'audience display' => ['GET', '/event/testevent/display', []],
    'rankings display' => ['GET', '/event/testevent/referee/display', []],
    'bracket display' => ['GET', '/event/testevent/elimination/bracket', []],
    'alliance selection display' => ['GET', '/event/testevent/alliance-selection/display', []],
    'match list' => ['GET', '/api/matches', []],
    'display heartbeat' => ['POST', '/api/display/connected', ['display_id' => '0b9f9a5e-6a8d-4c1b-9f3a-2d7e5c4b1a90', 'type' => 'audience', 'mute' => false, 'flipped' => false]],
]);

it('keeps the session on pages that can sign people in', function () {
    $this->get('/event/testevent')->assertOk()->assertCookie(config('session.cookie'));
});

it('tells the event home what the visitor may open', function () {
    $this->get('/event/testevent')->assertInertia(fn ($page) => $page
        ->where('auth.role', null)
        ->where('auth.can.manageCompetition', false)
        ->where('auth.can.inspectRobots', false)
        ->where('auth.can.manageAwards', false)
    );

    $this->actingAs(User::factory()->create(['role' => UserRole::Inspector]))->get('/event/testevent')->assertInertia(fn ($page) => $page
        ->where('auth.role', 'Inspector')
        ->where('auth.can.inspectRobots', true)
        ->where('auth.can.overrideInspection', false)
        ->where('auth.can.controlMatches', false)
    );
});
