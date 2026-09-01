<?php

use App\Models\Setting;
use App\Services\MatchTimingService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('falls back to config defaults when no settings are stored', function () {
    $timing = (new MatchTimingService)->current();

    expect($timing['autonomous'])->toBe(config('competition.timing.autonomous'));
    expect($timing['transition'])->toBe(config('competition.timing.transition'));
    expect($timing['teleop'])->toBe(config('competition.timing.teleop'));
    expect($timing['pre_match_countdown'])->toBe(config('competition.timing.pre_match_countdown'));
});

it('computes total_match and total_with_countdown from the parts', function () {
    $timing = (new MatchTimingService)->current();

    expect($timing['total_match'])->toBe($timing['autonomous'] + $timing['transition'] + $timing['teleop']);
    expect($timing['total_with_countdown'])->toBe($timing['total_match'] + $timing['pre_match_countdown']);
});

it('prefers stored settings over config defaults', function () {
    Setting::set('competition', 'autonomous', 45);
    Setting::set('competition', 'teleop', 100);

    $timing = (new MatchTimingService)->current();

    expect($timing['autonomous'])->toBe(45);
    expect($timing['teleop'])->toBe(100);
});

it('reports the total duration in milliseconds', function () {
    Setting::set('competition', 'pre_match_countdown', 3);
    Setting::set('competition', 'autonomous', 30);
    Setting::set('competition', 'transition', 20);
    Setting::set('competition', 'teleop', 120);

    $durationMs = (new MatchTimingService)->currentDurationMs();

    expect($durationMs)->toBe((3 + 30 + 20 + 120) * 1000);
});
