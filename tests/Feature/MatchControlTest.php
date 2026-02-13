<?php

use App\Enums\MatchStatus;
use App\Events\MatchStatusChanged;
use App\Models\CompetitionMatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->create(['id' => 1]);
    $this->actingAs(User::find(1));
});

it('starts an upcoming match', function () {
    Event::fake();

    $match = CompetitionMatch::factory()->create([
        'status' => MatchStatus::UPCOMING,
    ]);

    $response = $this->postJson('/api/matches/start', [
        'match_id' => $match->id,
    ]);

    $response->assertSuccessful();

    $match->refresh();
    expect($match->status)->toBe(MatchStatus::ONGOING);
    expect($match->started_at)->not->toBeNull();

    Event::assertDispatched(MatchStatusChanged::class, function ($event) use ($match) {
        return $event->match->id === $match->id && $event->action === 'started';
    });
});

it('cannot start a match when another is ongoing', function () {
    CompetitionMatch::factory()->create([
        'status' => MatchStatus::ONGOING,
        'started_at' => now(),
    ]);

    $match = CompetitionMatch::factory()->create([
        'status' => MatchStatus::UPCOMING,
    ]);

    $response = $this->postJson('/api/matches/start', [
        'match_id' => $match->id,
    ]);

    $response->assertStatus(409);

    $match->refresh();
    expect($match->status)->toBe(MatchStatus::UPCOMING);
});

it('ends an ongoing match', function () {
    Event::fake();

    $match = CompetitionMatch::factory()->create([
        'status' => MatchStatus::ONGOING,
        'started_at' => now()->subMinutes(3),
    ]);

    $response = $this->postJson('/api/matches/end', [
        'match_id' => $match->id,
    ]);

    $response->assertSuccessful();

    $match->refresh();
    expect($match->status)->toBe(MatchStatus::COMPLETED);
    expect($match->ended_at)->not->toBeNull();

    Event::assertDispatched(MatchStatusChanged::class, function ($event) use ($match) {
        return $event->match->id === $match->id && $event->action === 'ended';
    });
});

it('cancels an ongoing match and resets to upcoming', function () {
    Event::fake();

    $match = CompetitionMatch::factory()->create([
        'status' => MatchStatus::ONGOING,
        'started_at' => now()->subMinutes(1),
    ]);

    $response = $this->postJson('/api/matches/cancel', [
        'match_id' => $match->id,
    ]);

    $response->assertSuccessful();

    $match->refresh();
    expect($match->status)->toBe(MatchStatus::UPCOMING);
    expect($match->started_at)->toBeNull();
    expect($match->cancelled_at)->not->toBeNull();

    Event::assertDispatched(MatchStatusChanged::class, function ($event) use ($match) {
        return $event->match->id === $match->id && $event->action === 'cancelled';
    });
});

it('cannot start a completed match', function () {
    $match = CompetitionMatch::factory()->create([
        'status' => MatchStatus::COMPLETED,
        'started_at' => now()->subMinutes(5),
        'ended_at' => now()->subMinutes(2),
    ]);

    $response = $this->postJson('/api/matches/start', [
        'match_id' => $match->id,
    ]);

    $response->assertStatus(422);
});

it('cannot end an upcoming match', function () {
    $match = CompetitionMatch::factory()->create([
        'status' => MatchStatus::UPCOMING,
    ]);

    $response = $this->postJson('/api/matches/end', [
        'match_id' => $match->id,
    ]);

    $response->assertStatus(422);
});

it('cannot cancel an upcoming match', function () {
    $match = CompetitionMatch::factory()->create([
        'status' => MatchStatus::UPCOMING,
    ]);

    $response = $this->postJson('/api/matches/cancel', [
        'match_id' => $match->id,
    ]);

    $response->assertStatus(422);
});

it('cannot start a non-existent match', function () {
    $response = $this->postJson('/api/matches/start', [
        'match_id' => 9999,
    ]);

    $response->assertUnprocessable();
});
