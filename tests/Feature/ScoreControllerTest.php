<?php

use App\Enums\MatchStatus;
use App\Enums\MatchType;
use App\Enums\UserRole;
use App\Events\ScoreUpdated;
use App\Http\Controllers\Api\ScoreController;
use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\Score;
use App\Models\ScoreType;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->admin()->create(['id' => 1]);
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

    $this->scoreType = ScoreType::factory()->create(['points' => 10, 'target' => 'team']);
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

it('records a retried scoring tap only once', function () {
    Event::fake();
    $tap = [
        'match_id' => $this->match->id,
        'team_id' => $this->team->id,
        'score_type_id' => $this->scoreType->id,
        'client_request_id' => (string) Str::uuid(),
    ];

    $this->postJson('/api/scores', $tap)->assertCreated();
    $this->postJson('/api/scores', $tap)->assertOk()->assertJsonPath('match.match_alliances.0.score', 10);

    expect(Score::query()->count())->toBe(1)
        ->and($this->matchAlliance->refresh()->score)->toBe(10);
    Event::assertDispatchedTimes(ScoreUpdated::class, 1);
});

it('rejects a scoring request id reused for a different match', function () {
    $tap = ['match_id' => $this->match->id, 'team_id' => $this->team->id, 'score_type_id' => $this->scoreType->id, 'client_request_id' => (string) Str::uuid()];
    $this->postJson('/api/scores', $tap)->assertCreated();

    $otherMatch = CompetitionMatch::factory()->create(['status' => MatchStatus::ONGOING]);
    MatchAlliance::create(['match_id' => $otherMatch->id, 'team_id' => $this->team->id, 'alliance_id' => $this->red->id, 'alliance_pos' => 1, 'score' => 0, 'created_by' => 1]);

    $this->postJson('/api/scores', [...$tap, 'match_id' => $otherMatch->id])->assertJsonValidationErrors('client_request_id');
});

it('adds an alliance-wide score without affecting team scores', function () {
    Event::fake();
    $this->scoreType->update(['target' => 'alliance']);

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

it('preserves awarded points when a score type changes and undo uses the snapshot', function () {
    $scoreId = $this->postJson('/api/scores', [
        'match_id' => $this->match->id, 'team_id' => $this->team->id, 'score_type_id' => $this->scoreType->id,
    ])->assertCreated()->json('match.scores.0.id');
    $this->scoreType->update(['points' => 25]);

    $this->getJson('/api/matches/'.$this->match->id)->assertJsonPath('scores.0.points', 10);
    $this->deleteJson('/api/scores/'.$scoreId)->assertSuccessful();
    expect($this->matchAlliance->fresh()->score)->toBe(0);
});

it('rejects scores for teams and alliances outside the match', function () {
    $otherTeam = Team::factory()->create();
    $this->postJson('/api/scores', [
        'match_id' => $this->match->id, 'team_id' => $otherTeam->id, 'score_type_id' => $this->scoreType->id,
    ])->assertUnprocessable()->assertJsonValidationErrors('team_id');

    $this->scoreType->update(['target' => 'alliance']);
    $this->postJson('/api/scores', [
        'match_id' => $this->match->id, 'alliance_id' => $this->blue->id, 'score_type_id' => $this->scoreType->id,
    ])->assertUnprocessable()->assertJsonValidationErrors('alliance_id');
    expect($this->match->scores()->count())->toBe(0);
});

it('rejects ambiguous targets and mismatched score types', function () {
    $this->postJson('/api/scores', [
        'match_id' => $this->match->id, 'team_id' => $this->team->id, 'alliance_id' => $this->red->id,
        'score_type_id' => $this->scoreType->id,
    ])->assertUnprocessable();
    $this->postJson('/api/scores', [
        'match_id' => $this->match->id, 'alliance_id' => $this->red->id, 'score_type_id' => $this->scoreType->id,
    ])->assertUnprocessable()->assertJsonValidationErrors('score_type_id');
});

it('rolls back score history when the total update fails', function () {
    Event::listen('eloquent.updating: '.MatchAlliance::class, function (): void {
        throw new RuntimeException('Simulated write failure');
    });
    $this->withoutExceptionHandling();

    try {
        $this->postJson('/api/scores', [
            'match_id' => $this->match->id, 'team_id' => $this->team->id, 'score_type_id' => $this->scoreType->id,
        ]);
        $this->fail('The simulated write failure must be raised.');
    } catch (RuntimeException $exception) {
        expect($exception->getMessage())->toBe('Simulated write failure');
    }

    expect($this->match->scores()->count())->toBe(0);
    expect($this->matchAlliance->fresh()->score)->toBe(0);
});

it('does not subtract twice when deletion receives a stale score model', function () {
    $this->postJson('/api/scores', [
        'match_id' => $this->match->id, 'team_id' => $this->team->id, 'score_type_id' => $this->scoreType->id,
    ])->assertCreated();
    $score = $this->match->scores()->firstOrFail();
    $controller = app(ScoreController::class);
    $controller->destroy($score);

    expect(fn () => $controller->destroy($score))->toThrow(ModelNotFoundException::class);
    expect($this->matchAlliance->fresh()->score)->toBe(0);
});

it('records manual corrections and keeps subsequent score additions and undo consistent', function () {
    $this->postJson('/api/scores', [
        'match_id' => $this->match->id, 'team_id' => $this->team->id, 'score_type_id' => $this->scoreType->id,
    ])->assertCreated();
    $this->postJson('/api/matches/'.$this->match->id.'/update-score', [
        'match_alliances' => [['id' => $this->matchAlliance->id, 'score' => 17]],
    ])->assertSuccessful()->assertJsonPath('match_alliances.0.score', 17);
    $correction = $this->match->scores()->whereNull('score_type_id')->firstOrFail();
    expect($correction->points)->toBe(7);
    expect((int) $this->match->scores()->sum('points'))->toBe(17);

    $this->postJson('/api/scores', [
        'match_id' => $this->match->id, 'team_id' => $this->team->id, 'score_type_id' => $this->scoreType->id,
    ])->assertCreated()->assertJsonPath('match.match_alliances.0.score', 27);
    $this->deleteJson('/api/scores/'.$correction->id)->assertSuccessful();
    expect($this->matchAlliance->fresh()->score)->toBe(20);
    expect((int) $this->match->scores()->sum('points'))->toBe(20);
});

it('validates manual corrections before applying any of them', function () {
    $this->postJson('/api/matches/'.$this->match->id.'/update-score', [
        'match_alliances' => [['id' => $this->matchAlliance->id, 'score' => 50], ['id' => 99999, 'score' => 10]],
    ])->assertUnprocessable();
    expect($this->matchAlliance->fresh()->score)->toBe(0);
    expect($this->match->scores()->count())->toBe(0);
});

it('broadcasts the complete score history and score types', function () {
    Event::fake([ScoreUpdated::class]);
    $this->postJson('/api/scores', [
        'match_id' => $this->match->id, 'team_id' => $this->team->id, 'score_type_id' => $this->scoreType->id,
    ])->assertCreated()->assertJsonPath('match.scores.0.points', 10);

    Event::assertDispatched(ScoreUpdated::class, function (ScoreUpdated $event): bool {
        $payload = $event->broadcastWith()['match']->toArray();

        return $payload['scores'][0]['points'] === 10 && $payload['scores'][0]['score_type']['id'] === $this->scoreType->id;
    });
});

it('broadcasts only the match id once the match no longer fits in one Reverb message', function () {
    Event::fake([ScoreUpdated::class]);

    $this->putJson('/api/scores/count', [
        'match_id' => $this->match->id, 'team_id' => $this->team->id, 'score_type_id' => $this->scoreType->id, 'count' => 40,
    ])->assertOk()->assertJsonCount(40, 'match.scores');

    Event::assertDispatched(ScoreUpdated::class, fn (ScoreUpdated $event): bool => $event->broadcastWith() === ['match_id' => $this->match->id]);
});

it('rolls back the total when deleting a score fails', function () {
    $scoreId = $this->postJson('/api/scores', [
        'match_id' => $this->match->id, 'team_id' => $this->team->id, 'score_type_id' => $this->scoreType->id,
    ])->assertCreated()->json('match.scores.0.id');
    Event::listen('eloquent.deleting: '.Score::class, function (): void {
        throw new RuntimeException('Simulated delete failure');
    });
    $this->withoutExceptionHandling();
    try {
        $this->deleteJson('/api/scores/'.$scoreId);
        $this->fail('The simulated delete failure must be raised.');
    } catch (RuntimeException $exception) {
        expect($exception->getMessage())->toBe('Simulated delete failure');
    }
    expect($this->matchAlliance->fresh()->score)->toBe(10);
    expect($this->match->scores()->count())->toBe(1);
});

it('allows referees to undo scoring actions but not manual corrections', function () {
    $this->postJson('/api/matches/'.$this->match->id.'/update-score', [
        'match_alliances' => [['id' => $this->matchAlliance->id, 'score' => 17]],
    ])->assertSuccessful();
    $correction = $this->match->scores()->firstOrFail();
    $this->actingAs(User::factory()->create(['role' => UserRole::Referee]));
    $this->deleteJson('/api/scores/'.$correction->id)->assertForbidden();
    $scoreId = $this->postJson('/api/scores', [
        'match_id' => $this->match->id, 'team_id' => $this->team->id, 'score_type_id' => $this->scoreType->id,
    ])->assertCreated()->json('match.scores.1.id');
    $this->deleteJson('/api/scores/'.$scoreId)->assertSuccessful();
    expect($this->matchAlliance->fresh()->score)->toBe(17);
});

it('retains alliance point snapshots including zero and negative values', function (int $points) {
    $this->scoreType->update(['points' => $points, 'target' => 'alliance']);
    $scoreId = $this->postJson('/api/scores', [
        'match_id' => $this->match->id, 'alliance_id' => $this->red->id, 'score_type_id' => $this->scoreType->id,
    ])->assertCreated()->json('match.scores.0.id');
    $this->scoreType->update(['points' => 100]);
    $this->match->update(['status' => MatchStatus::COMPLETED]);
    $this->getJson('/api/matches/teams-display')->assertJsonPath('0.alliance_score', $points);
    $this->deleteJson('/api/scores/'.$scoreId)->assertSuccessful();
    expect($this->matchAlliance->fresh()->score)->toBe(0);
})->with([0, -10]);

it('broadcasts score updates on the match channel and the match-control channel', function () {
    $channels = collect((new ScoreUpdated($this->match))->broadcastOn())->map->name->all();

    expect($channels)->toBe(['event.testevent.matches.'.$this->match->id, 'event.testevent.match-control']);
});

it('scores a yes/no score type at most once per robot', function () {
    $leave = ScoreType::factory()->create(['name' => 'leave', 'points' => 3, 'target' => 'team', 'kind' => 'toggle']);
    $tap = ['match_id' => $this->match->id, 'team_id' => $this->team->id, 'score_type_id' => $leave->id];

    $this->postJson('/api/scores', $tap)->assertCreated();
    $this->postJson('/api/scores', $tap)->assertOk();

    expect(Score::query()->where('score_type_id', $leave->id)->count())->toBe(1)
        ->and($this->matchAlliance->fresh()->score)->toBe(3);
});

it('replaces the option chosen before when another option of the same set is picked', function () {
    $partial = ScoreType::factory()->create(['name' => 'base_partial', 'points' => 5, 'target' => 'team', 'kind' => 'choice', 'choice_set' => 'Base']);
    $full = ScoreType::factory()->create(['name' => 'base_full', 'points' => 10, 'target' => 'team', 'kind' => 'choice', 'choice_set' => 'Base']);
    $tap = fn (ScoreType $type) => ['match_id' => $this->match->id, 'team_id' => $this->team->id, 'score_type_id' => $type->id];

    $this->postJson('/api/scores', $tap($partial))->assertCreated();
    $this->postJson('/api/scores', $tap($this->scoreType))->assertCreated();
    $this->postJson('/api/scores', $tap($full))->assertCreated();
    $this->postJson('/api/scores', $tap($full))->assertOk();

    expect(Score::query()->pluck('score_type_id')->sort()->values()->all())->toBe([$this->scoreType->id, $full->id])
        ->and($this->matchAlliance->fresh()->score)->toBe(20, 'the counted score stays, partial is swapped for full');
});

it('keeps each robot and the alliance-wide set to their own choice', function () {
    $otherTeam = Team::factory()->create();
    MatchAlliance::create(['match_id' => $this->match->id, 'team_id' => $otherTeam->id, 'alliance_id' => $this->red->id, 'alliance_pos' => 2, 'score' => 0, 'created_by' => 1, 'updated_by' => 1]);
    $park = ScoreType::factory()->create(['name' => 'park', 'points' => 3, 'target' => 'team', 'kind' => 'choice', 'choice_set' => 'Ascent']);
    $high = ScoreType::factory()->create(['name' => 'level_3', 'points' => 30, 'target' => 'team', 'kind' => 'choice', 'choice_set' => 'Ascent']);

    $this->postJson('/api/scores', ['match_id' => $this->match->id, 'team_id' => $this->team->id, 'score_type_id' => $park->id])->assertCreated();
    $this->postJson('/api/scores', ['match_id' => $this->match->id, 'team_id' => $otherTeam->id, 'score_type_id' => $high->id])->assertCreated();

    expect(Score::query()->count())->toBe(2);
});

it('requires a set name for a "one of" score type and drops it for other kinds', function () {
    $this->postJson('/api/score-types', ['name' => 'Full', 'points' => 10, 'target' => 'team', 'kind' => 'choice'])
        ->assertJsonValidationErrors('choice_set');

    $this->postJson('/api/score-types', ['name' => 'Leave', 'points' => 3, 'target' => 'team', 'kind' => 'toggle', 'choice_set' => 'Base'])
        ->assertCreated()
        ->assertJsonPath('kind', 'toggle')
        ->assertJsonPath('choice_set', null);

    $this->postJson('/api/score-types', ['name' => 'Goal', 'points' => 1, 'target' => 'team'])
        ->assertCreated()
        ->assertJsonPath('kind', 'count');
});

it('lists matches with alliance-wide score rows for totals but not every robot tap', function () {
    $bonus = ScoreType::factory()->create(['points' => 20, 'target' => 'alliance']);
    $this->postJson('/api/scores', ['match_id' => $this->match->id, 'team_id' => $this->team->id, 'score_type_id' => $this->scoreType->id])->assertCreated();
    $this->postJson('/api/scores', ['match_id' => $this->match->id, 'alliance_id' => $this->red->id, 'score_type_id' => $bonus->id])->assertCreated();

    $response = $this->getJson('/api/matches');

    $response->assertOk()
        ->assertJsonCount(1, '0.scores')
        ->assertJsonPath('0.scores.0.points', 20)
        ->assertJsonPath('0.scores.0.team_id', null)
        ->assertJsonMissingPath('0.scores.0.score_type')
        ->assertJsonPath('0.match_alliances.0.score', 10);
});

it('stops an ordinary referee from changing a match that is not running', function (MatchStatus $status) {
    $this->match->update(['status' => $status]);
    $this->actingAs(User::factory()->create(['role' => UserRole::Referee]));

    $response = $this->putJson('/api/scores/count', [
        'match_id' => $this->match->id, 'team_id' => $this->team->id, 'score_type_id' => $this->scoreType->id, 'count' => 2,
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('match_id');
    expect($this->match->scores()->count())->toBe(0);
})->with([MatchStatus::COMPLETED, MatchStatus::UPCOMING]);

it('lets the head referee correct a completed match', function () {
    $this->match->update(['status' => MatchStatus::COMPLETED]);

    $this->putJson('/api/scores/count', [
        'match_id' => $this->match->id, 'team_id' => $this->team->id, 'score_type_id' => $this->scoreType->id, 'count' => 2,
    ])->assertOk();

    expect($this->match->scores()->count())->toBe(2);
});

it('raises the match revision with every score change', function () {
    $before = $this->match->fresh()->revision;

    $response = $this->putJson('/api/scores/count', [
        'match_id' => $this->match->id, 'team_id' => $this->team->id, 'score_type_id' => $this->scoreType->id, 'count' => 1,
    ]);

    $response->assertOk()->assertJsonPath('match.revision', $before + 1);
    expect($this->match->fresh()->revision)->toBe($before + 1);
});

it('still saves a score when Reverb cannot be reached', function () {
    config(['broadcasting.default' => 'reverb', 'broadcasting.connections.reverb.options.host' => '127.0.0.1', 'broadcasting.connections.reverb.options.port' => 1]);

    $response = $this->putJson('/api/scores/count', [
        'match_id' => $this->match->id, 'team_id' => $this->team->id, 'score_type_id' => $this->scoreType->id, 'count' => 1,
    ]);

    $response->assertOk();
    expect($this->match->scores()->count())->toBe(1);
});
