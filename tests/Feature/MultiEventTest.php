<?php

use App\Enums\MatchType;
use App\Models\CompetitionMatch;
use App\Models\Event;
use App\Models\Group;
use App\Models\Score;
use App\Models\ScoreType;
use App\Models\Team;
use App\Models\User;
use App\Services\CurrentEvent;
use App\Services\MatchTimingService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
    $this->otherEvent = Event::factory()->create(['code' => 'otherevent']);
});

/**
 * Creates rows for the other event without changing the test's current event.
 *
 * @template TReturn
 *
 * @param  callable(): TReturn  $callback
 * @return TReturn
 */
function inOtherEvent(callable $callback): mixed
{
    return app(CurrentEvent::class)->using(test()->otherEvent, $callback);
}

it('only lists the requested event\'s teams', function () {
    Team::factory()->create(['number' => 100]);
    inOtherEvent(fn () => Team::factory()->create(['number' => 200]));

    $this->getJson('/api/event/testevent/teams')->assertOk()->assertJsonCount(1)->assertJsonPath('0.number', 100);
    $this->getJson('/api/event/otherevent/teams')->assertOk()->assertJsonCount(1)->assertJsonPath('0.number', 200);
});

it('lets two events use the same team number', function () {
    inOtherEvent(fn () => Team::factory()->create(['number' => 4242]));

    $this->actingAs($this->admin)
        ->postJson('/api/teams', ['number' => 4242, 'name' => 'Same Number'])
        ->assertCreated();
});

it('cannot edit another event\'s team through this event\'s URL', function () {
    $foreignTeam = inOtherEvent(fn () => Team::factory()->create());

    $this->actingAs($this->admin)
        ->putJson('/api/teams/'.$foreignTeam->id, ['number' => 1, 'name' => 'Hijacked'])
        ->assertNotFound();
});

it('rejects score types from another event', function () {
    $foreignGroup = inOtherEvent(fn () => Group::factory()->create());

    $this->actingAs($this->admin)
        ->postJson('/api/score-types', ['name' => 'Goal', 'points' => 5, 'target' => 'team', 'group_id' => $foreignGroup->id])
        ->assertJsonValidationErrors('group_id');
});

it('creates an event that plays another event\'s game', function () {
    inOtherEvent(function (): void {
        $group = Group::factory()->create(['name' => 'Autonomous']);
        ScoreType::factory()->create(['name' => 'Park', 'points' => 3, 'group_id' => $group->id]);
        Team::factory()->create();
    });
    $this->otherEvent->game->update(['timing' => ['teleop' => 90]]);

    $this->actingAs($this->admin)->post('/events', [
        'code' => 'Spring_Meet',
        'name' => 'Spring Meet',
        'type' => 'league_meet',
        'timezone' => 'Africa/Tripoli',
        'start_date' => '2026-12-01',
        'end_date' => '2026-12-01',
        'field_count' => 2,
        'game_id' => $this->otherEvent->game_id,
    ])->assertRedirect('/event/spring_meet/dashboard');

    $created = Event::query()->where('code', 'spring_meet')->firstOrFail();

    expect($created->game_id)->toBe($this->otherEvent->game_id);

    app(CurrentEvent::class)->using($created, function (): void {
        expect(ScoreType::query()->with('group')->sole())
            ->name->toBe('Park')
            ->group->name->toBe('Autonomous');
        expect(app(MatchTimingService::class)->current()['teleop'])->toBe(90);
        expect(Team::query()->count())->toBe(0);
    });
});

it('gives a new event a blank game of its own when no game is picked', function () {
    $this->actingAs($this->admin)->post('/events', [
        'code' => 'fresh',
        'name' => 'Fresh Meet',
        'type' => 'scrimmage',
        'timezone' => 'UTC',
        'start_date' => '2026-12-01',
        'end_date' => '2026-12-01',
        'field_count' => 1,
        'game_id' => '',
    ])->assertRedirect('/event/fresh/dashboard');

    expect(Event::query()->where('code', 'fresh')->sole()->game)
        ->name->toBe('Fresh Meet game')
        ->scoreTypes->toBeEmpty();
});

it('rejects event codes that would break URLs', function (string $code) {
    $this->actingAs($this->admin)->post('/events', [
        'code' => $code,
        'name' => 'Bad',
        'type' => 'scrimmage',
        'timezone' => 'UTC',
        'start_date' => '2026-12-01',
        'end_date' => '2026-12-01',
        'field_count' => 1,
    ])->assertSessionHasErrors('code');
})->with(['has space', 'dash-code', 'x', 'testevent']);

it('only lets admins create events', function () {
    $this->actingAs(User::factory()->create())->get('/events/create')->assertForbidden();
});

it('archives and restores an event', function () {
    $this->actingAs($this->admin)->post('/event/testevent/archive')->assertRedirect();
    expect($this->event->fresh()->isArchived())->toBeTrue();

    $this->actingAs($this->admin)->post('/event/testevent/archive');
    expect($this->event->fresh()->isArchived())->toBeFalse();
});

it('keeps other events\' matches when deleting, regenerating or resetting playoffs', function () {
    $foreign = inOtherEvent(function () {
        $match = CompetitionMatch::factory()->create();
        CompetitionMatch::factory()->create(['type' => MatchType::ELIMINATION]);
        $team = Team::factory()->create();
        Score::factory()->create(['match_id' => $match->id, 'team_id' => $team->id]);

        return $match;
    });
    CompetitionMatch::factory()->create();

    $this->actingAs($this->admin)->deleteJson('/api/matches/delete-all')->assertOk();
    $this->actingAs($this->admin)->deleteJson('/api/elimination/reset')->assertOk();

    expect(CompetitionMatch::query()->count())->toBe(0);
    inOtherEvent(function () use ($foreign): void {
        expect(CompetitionMatch::query()->count())->toBe(2)
            ->and(Score::query()->where('match_id', $foreign->id)->count())->toBe(1);
    });
});
