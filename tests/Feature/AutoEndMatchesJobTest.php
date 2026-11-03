<?php

use App\Enums\MatchStatus;
use App\Events\MatchStatusChanged;
use App\Jobs\AutoEndMatchesJob;
use App\Models\CompetitionMatch;
use App\Models\User;
use App\Services\MatchTimingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->create(['id' => 1]);
    $this->travelTo(now()->startOfSecond());
    Event::fake([MatchStatusChanged::class]);
});

it('ends expired matches using their own duration and broadcasts once', function () {
    $match = CompetitionMatch::factory()->create([
        'status' => MatchStatus::ONGOING, 'started_at' => now()->subSeconds(60), 'duration_ms' => 60000,
    ]);
    app()->call([new AutoEndMatchesJob, 'handle']);
    app()->call([new AutoEndMatchesJob, 'handle']);

    expect($match->fresh()->status)->toBe(MatchStatus::COMPLETED);
    expect($match->fresh()->ended_at->equalTo(now()))->toBeTrue();
    Event::assertDispatchedTimes(MatchStatusChanged::class, 1);
    Event::assertDispatched(MatchStatusChanged::class, fn ($event): bool => $event->action === 'ended' && $event->match->id === $match->id);
});

it('does not end long matches early even after settings change', function () {
    $match = CompetitionMatch::factory()->create([
        'status' => MatchStatus::ONGOING, 'started_at' => now()->subSeconds(200), 'duration_ms' => 300000,
    ]);
    $this->event->game->update(['timing' => ['teleop' => 10]]);
    app()->call([new AutoEndMatchesJob, 'handle']);
    expect($match->fresh()->status)->toBe(MatchStatus::ONGOING);
    Event::assertNothingDispatched();
});

it('uses configured timing for legacy matches without a duration snapshot', function () {
    $this->event->game->update(['timing' => ['teleop' => 200]]);
    $duration = app(MatchTimingService::class)->currentDurationMs();
    $match = CompetitionMatch::factory()->create([
        'status' => MatchStatus::ONGOING, 'started_at' => now()->subMilliseconds($duration), 'duration_ms' => null,
    ]);
    app()->call([new AutoEndMatchesJob, 'handle']);
    expect($match->fresh()->status)->toBe(MatchStatus::COMPLETED);
});

it('ignores upcoming matches and matches without a start time', function () {
    $upcoming = CompetitionMatch::factory()->create(['status' => MatchStatus::UPCOMING, 'started_at' => now()->subHour()]);
    $noStart = CompetitionMatch::factory()->create(['status' => MatchStatus::ONGOING, 'started_at' => null]);
    app()->call([new AutoEndMatchesJob, 'handle']);
    expect($upcoming->fresh()->status)->toBe(MatchStatus::UPCOMING);
    expect($noStart->fresh()->status)->toBe(MatchStatus::ONGOING);
    Event::assertNothingDispatched();
});
