<?php

use App\Events\AllianceSelectionUpdated;
use App\Events\EliminationBracketUpdated;
use App\Events\MatchStatusChanged;
use App\Events\ScoreUpdated;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

/**
 * @return array<string, array{listeners: array<int, array{channel: array{name: string, type: string}, events: array<int, string>}>, throttle?: int}>
 */
function liveProps(TestResponse $response): array
{
    return $response->viewData('page')['liveProps'] ?? [];
}

test('the rankings display serves rankings as a live prop on the match-control channel', function () {
    $response = $this->get('/referee/display')->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->component('referee/display')
        ->has('rankings')
    );

    expect(liveProps($response)['rankings'])->toBe([
        'listeners' => [[
            'channel' => ['name' => 'event.testevent.match-control', 'type' => 'public'],
            'events' => [MatchStatusChanged::class, ScoreUpdated::class],
        ]],
        'throttle' => 3000,
    ]);
});

test('the elimination bracket display serves the bracket as a live prop', function () {
    $response = $this->get('/elimination/bracket')->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->component('elimination/bracket')
        ->has('bracket.series')
        ->has('bracket.alliance_groups')
    );

    expect(liveProps($response)['bracket']['listeners'])->toBe([
        ['channel' => ['name' => 'event.testevent.elimination', 'type' => 'public'], 'events' => [EliminationBracketUpdated::class]],
        ['channel' => ['name' => 'event.testevent.match-control', 'type' => 'public'], 'events' => [MatchStatusChanged::class, ScoreUpdated::class]],
        ['channel' => ['name' => 'event.testevent.alliance-selection', 'type' => 'public'], 'events' => [AllianceSelectionUpdated::class]],
    ]);
});

test('a live partial reload returns only the requested prop', function () {
    $this->get('/referee/display')
        ->assertInertia(fn ($page) => $page->reloadOnly('rankings', fn ($reload) => $reload
            ->where('rankings', [])
            ->missing('matchConfig')
        ));
});

test('dashboard stats stay deferred and are live', function () {
    $this->actingAs(User::factory()->admin()->create());

    $response = $this->get('/dashboard')->assertOk();

    $response->assertInertia(fn ($page) => $page->missing('stats'));

    expect(liveProps($response)['stats'])->toBe([
        'listeners' => [[
            'channel' => ['name' => 'event.testevent.match-control', 'type' => 'public'],
            'events' => [MatchStatusChanged::class],
        ]],
        'throttle' => 3000,
    ]);
});
