<?php

use App\Enums\MatchStatus;
use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\Team;
use App\Models\User;
use App\Services\CurrentEvent;
use App\Services\MatchScheduler;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
    $this->event = app(CurrentEvent::class)->require();
});

it('alternates scheduled matches between the fields', function () {
    $this->event->update(['field_count' => 2]);
    Alliance::create(['name' => 'Red Alliance', 'color' => 'red']);
    Alliance::create(['name' => 'Blue Alliance', 'color' => 'blue']);
    Team::factory()->count(8)->create();

    (new MatchScheduler)->generate(minMatchesPerTeam: 2, createdBy: $this->admin->id, teamsPerAlliance: 2);

    $fields = CompetitionMatch::query()->orderBy('number')->pluck('field', 'number');

    expect($fields->take(4)->values()->all())->toBe([1, 2, 1, 2]);
});

it('puts every match on field 1 at a single-field event', function () {
    Alliance::create(['name' => 'Red Alliance', 'color' => 'red']);
    Alliance::create(['name' => 'Blue Alliance', 'color' => 'blue']);
    Team::factory()->count(4)->create();

    (new MatchScheduler)->generate(minMatchesPerTeam: 2, createdBy: $this->admin->id, teamsPerAlliance: 2);

    expect(CompetitionMatch::query()->distinct()->pluck('field')->all())->toBe([1]);
});

it('re-spreads unplayed matches when the number of fields changes, leaving played ones alone', function () {
    $played = CompetitionMatch::factory()->create(['number' => 2, 'field' => 1, 'status' => MatchStatus::COMPLETED]);
    $upcoming = CompetitionMatch::factory()->create(['number' => 4, 'field' => 1, 'status' => MatchStatus::UPCOMING]);

    $this->actingAs($this->admin)->put('/event/testevent', [
        'name' => $this->event->name,
        'type' => $this->event->type->value,
        'timezone' => 'UTC',
        'start_date' => '2026-12-01',
        'end_date' => '2026-12-01',
        'field_count' => 2,
    ])->assertSessionHasNoErrors();

    expect($upcoming->fresh()->field)->toBe(2)
        ->and($played->fresh()->field)->toBe(1);
});
