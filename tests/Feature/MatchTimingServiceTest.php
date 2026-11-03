<?php

use App\Services\MatchTimingService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('falls back to config defaults when the game sets no timing', function () {
    $timing = app(MatchTimingService::class)->current();

    expect($timing['autonomous'])->toBe(config('competition.timing.autonomous'));
    expect($timing['transition'])->toBe(config('competition.timing.transition'));
    expect($timing['teleop'])->toBe(config('competition.timing.teleop'));
    expect($timing['pre_match_countdown'])->toBe(config('competition.timing.pre_match_countdown'));
});

it('computes total_match and total_with_countdown from the parts', function () {
    $timing = app(MatchTimingService::class)->current();

    expect($timing['total_match'])->toBe($timing['autonomous'] + $timing['transition'] + $timing['teleop']);
    expect($timing['total_with_countdown'])->toBe($timing['total_match'] + $timing['pre_match_countdown']);
});

it('prefers the game timing over config defaults', function () {
    $this->event->game->update(['timing' => ['autonomous' => 45, 'teleop' => 100]]);

    $timing = app(MatchTimingService::class)->current();

    expect($timing['autonomous'])->toBe(45);
    expect($timing['teleop'])->toBe(100);
});

it('reports the total duration in milliseconds', function () {
    $this->event->game->update(['timing' => ['pre_match_countdown' => 3, 'autonomous' => 30, 'transition' => 20, 'teleop' => 120]]);

    $durationMs = app(MatchTimingService::class)->currentDurationMs();

    expect($durationMs)->toBe((3 + 30 + 20 + 120) * 1000);
});
