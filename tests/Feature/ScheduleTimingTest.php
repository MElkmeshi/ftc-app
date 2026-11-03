<?php

use App\Enums\MatchStatus;
use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->event->update(['timezone' => 'Africa/Tripoli']);
    $this->actingAs(User::factory()->admin()->create());
});

it('plans match times from the first match, cycle time and breaks', function () {
    foreach ([1, 2, 3, 4] as $number) {
        CompetitionMatch::factory()->create(['number' => $number, 'status' => MatchStatus::UPCOMING]);
    }

    $this->putJson('/api/matches/schedule-timing', [
        'first_match_at' => '2026-12-01T09:00',
        'cycle_minutes' => 6,
        'breaks' => [['after_match' => 2, 'minutes' => 30]],
    ])->assertOk()->assertJsonPath('first_match_at', '2026-12-01T09:00');

    // Tripoli is UTC+2.
    expect(CompetitionMatch::query()->orderBy('number')->get()->map(fn ($match) => $match->start_time->utc()->format('H:i'))->all())
        ->toBe(['07:00', '07:06', '07:42', '07:48']);
});

it('times a freshly generated schedule', function () {
    Alliance::query()->create(['color' => 'red']);
    Alliance::query()->create(['color' => 'blue']);
    Team::factory()->count(4)->create();

    $this->postJson('/api/matches/generate-schedule', [
        'matches_per_team' => 1,
        'teams_per_alliance' => 2,
        'first_match_at' => '2026-12-01T10:00',
        'cycle_minutes' => 8,
    ])->assertOk();

    expect(CompetitionMatch::query()->orderBy('number')->first()->start_time->utc()->format('Y-m-d H:i'))->toBe('2026-12-01 08:00');
});

it('rejects impossible timing', function () {
    $this->putJson('/api/matches/schedule-timing', ['first_match_at' => 'tomorrow', 'cycle_minutes' => 0])
        ->assertJsonValidationErrors(['first_match_at', 'cycle_minutes']);
});
