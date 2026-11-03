<?php

use App\Models\Event;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('lists every event on the home page', function () {
    Event::factory()->create(['code' => 'spring', 'name' => 'Spring Scrimmage']);

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
