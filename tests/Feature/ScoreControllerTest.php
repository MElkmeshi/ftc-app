<?php

use App\Enums\MatchStatus;
use App\Enums\MatchType;
use App\Events\ScoreUpdated;
use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\ScoreType;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->create(['id' => 1]);
    $this->actingAs(User::find(1));

    $this->red = Alliance::create(['name' => 'Red Alliance', 'color' => 'red']);
    $this->blue = Alliance::create(['name' => 'Blue Alliance', 'color' => 'blue']);

    $this->match = CompetitionMatch::create([
        'number' => 1,
        'type' => MatchType::QUALIFICATION,
        'status' => MatchStatus::ONGOING,
        'start_time' => now(),
        'started_at' => now(),
        'created_by' => 1,
        'updated_by' => 1,
    ]);

    $this->team = Team::factory()->create();

    $this->matchAlliance = MatchAlliance::create([
        'match_id' => $this->match->id,
        'team_id' => $this->team->id,
        'alliance_id' => $this->red->id,
        'alliance_pos' => 1,
        'score' => 0,
        'created_by' => 1,
        'updated_by' => 1,
    ]);

    $this->scoreType = ScoreType::factory()->create(['points' => 10]);
});

it('adds a team score and broadcasts the updated match', function () {
    Event::fake();

    $response = $this->postJson('/api/scores', [
        'match_id' => $this->match->id,
        'team_id' => $this->team->id,
        'score_type_id' => $this->scoreType->id,
    ]);

    $response->assertCreated();

    $this->matchAlliance->refresh();
    expect($this->matchAlliance->score)->toBe(10);

    Event::assertDispatched(ScoreUpdated::class, function ($event) {
        return $event->match->id === $this->match->id;
    });
});

it('adds an alliance-wide score without affecting team scores', function () {
    Event::fake();

    $this->postJson('/api/scores', [
        'match_id' => $this->match->id,
        'alliance_id' => $this->red->id,
        'score_type_id' => $this->scoreType->id,
    ])->assertCreated();

    $this->matchAlliance->refresh();
    expect($this->matchAlliance->score)->toBe(0);
    expect($this->match->scores()->count())->toBe(1);
});

it('requires either a team_id or an alliance_id', function () {
    $this->postJson('/api/scores', [
        'match_id' => $this->match->id,
        'score_type_id' => $this->scoreType->id,
    ])->assertStatus(422);
});

it('deletes a team score and subtracts its points back off the alliance', function () {
    $response = $this->postJson('/api/scores', [
        'match_id' => $this->match->id,
        'team_id' => $this->team->id,
        'score_type_id' => $this->scoreType->id,
    ]);

    $scoreId = $response->json('match.scores.0.id') ?? $this->match->scores()->latest('id')->first()->id;

    Event::fake();

    $this->deleteJson("/api/scores/{$scoreId}")->assertSuccessful();

    $this->matchAlliance->refresh();
    expect($this->matchAlliance->score)->toBe(0);

    Event::assertDispatched(ScoreUpdated::class);
});
