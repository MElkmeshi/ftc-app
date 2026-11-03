<?php

use App\Enums\MatchStatus;
use App\Enums\PointsAwardedTo;
use App\Enums\RankingMethod;
use App\Enums\RefereeRole;
use App\Enums\ScoreKind;
use App\Models\CompetitionMatch;
use App\Models\Event;
use App\Models\Game;
use App\Models\Group;
use App\Models\Score;
use App\Models\ScoreType;
use App\Models\User;
use App\Services\CurrentEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
    $this->game = $this->event->game;
});

it('lists games with the events that play them', function () {
    $league = Event::factory()->create(['code' => 'meet2', 'name' => 'Meet 2', 'game_id' => $this->game->id]);
    CompetitionMatch::factory()->create(['status' => MatchStatus::COMPLETED]);
    ScoreType::factory()->create();
    Game::factory()->create(['name' => 'Unused game']);
    $this->game->update(['name' => 'Workshop game']);
    $this->event->update(['name' => 'Workshop']);

    $this->actingAs($this->admin)->get('/games')->assertInertia(fn (Assert $page) => $page
        ->component('games/index')
        ->has('games', 2)
        ->where('games.1.id', $this->game->id)
        ->where('games.1.score_types_count', 1)
        ->where('games.1.events', [
            ['code' => $league->code, 'name' => 'Meet 2', 'has_played_matches' => false],
            ['code' => 'testevent', 'name' => 'Workshop', 'has_played_matches' => true],
        ])
        ->where('games.0.events', []));
});

it('creates a blank game', function () {
    $this->actingAs($this->admin)->post('/games', ['name' => 'Bottle Flip'])->assertRedirect();

    expect(Game::query()->where('name', 'Bottle Flip')->sole())
        ->scoreTypes->toBeEmpty()
        ->ranking_method->toBe(RankingMethod::TotalScore);
});

it('duplicates a game with its groups, score types, timing and ranking', function () {
    $group = Group::factory()->create(['name' => 'Autonomous']);
    ScoreType::factory()->create(['name' => 'Park', 'points' => 3, 'group_id' => $group->id]);
    $this->game->update(['timing' => ['teleop' => 90], 'ranking_method' => RankingMethod::Record]);

    $this->actingAs($this->admin)->post('/games', ['name' => 'Copy', 'duplicate_from' => $this->game->id])->assertRedirect();

    $copy = Game::query()->where('name', 'Copy')->sole();
    $copiedType = $copy->scoreTypes()->sole();

    expect($copy)
        ->timing->toBe(['teleop' => 90])
        ->ranking_method->toBe(RankingMethod::Record)
        ->and($copiedType->name)->toBe('Park')
        ->and($copiedType->group_id)->not->toBe($group->id)
        ->and($copiedType->group_id)->toBe($copy->groups()->sole()->id)
        ->and($this->game->scoreTypes()->count())->toBe(1, 'the original game keeps its score types');
});

it('edits a game directly, changing it for every event that plays it', function () {
    $other = Event::factory()->create(['game_id' => $this->game->id]);

    $this->actingAs($this->admin)
        ->postJson("/api/games/{$this->game->id}/score-types", ['name' => 'Goal', 'points' => 5, 'target' => 'team'])
        ->assertSuccessful();

    app(CurrentEvent::class)->using($other, fn () => expect(ScoreType::query()->sole()->name)->toBe('Goal'));
    expect(ScoreType::query()->sole()->name)->toBe('Goal');
});

it('keeps game edits inside that game', function () {
    $otherGame = Game::factory()->create();
    $foreignType = $otherGame->scoreTypes()->create(['name' => 'Theirs', 'points' => 1, 'target' => 'team']);

    $this->actingAs($this->admin)
        ->putJson("/api/games/{$this->game->id}/score-types/{$foreignType->id}", ['name' => 'Hijacked', 'points' => 1, 'target' => 'team'])
        ->assertNotFound();

    expect($foreignType->fresh()->name)->toBe('Theirs');
});

it('keeps the points already scored when a game score type changes', function () {
    $scoreType = ScoreType::factory()->create(['points' => 5]);
    $score = Score::factory()->create(['score_type_id' => $scoreType->id, 'points' => 5]);

    $this->actingAs($this->admin)
        ->putJson("/api/games/{$this->game->id}/score-types/{$scoreType->id}", ['name' => $scoreType->name, 'points' => 50, 'target' => 'team'])
        ->assertSuccessful();

    expect($score->fresh()->points)->toBe(5);
});

it('shows the editing page with the events that will be affected', function () {
    CompetitionMatch::factory()->create(['status' => MatchStatus::COMPLETED]);

    $this->actingAs($this->admin)->get("/games/{$this->game->id}/scoring")->assertInertia(fn (Assert $page) => $page
        ->component('admin/score-types')
        ->where('game.id', $this->game->id)
        ->where('game.events.0.has_played_matches', true));

    $this->actingAs($this->admin)->get('/admin/competition-settings')->assertInertia(fn (Assert $page) => $page
        ->component('admin/competition-settings')
        ->where('game.id', $this->game->id));
});

it('renames a game and deletes it only once no event plays it', function () {
    $unused = Game::factory()->create();

    $this->actingAs($this->admin)->put("/games/{$this->game->id}", ['name' => 'Renamed'])->assertRedirect();
    expect($this->game->fresh()->name)->toBe('Renamed');

    $this->actingAs($this->admin)->delete("/games/{$this->game->id}")->assertSessionHasErrors('game');
    expect($this->game->fresh())->not->toBeNull();

    $this->actingAs($this->admin)->delete("/games/{$unused->id}")->assertRedirect('/games');
    expect($unused->fresh())->toBeNull();
});

it('lets an event switch games until it has scores', function () {
    $otherGame = Game::factory()->create();
    $details = [
        'name' => $this->event->name, 'type' => 'scrimmage', 'timezone' => 'UTC',
        'start_date' => '2026-12-01', 'end_date' => '2026-12-01', 'field_count' => 1,
    ];

    $this->actingAs($this->admin)->put('/event/testevent', [...$details, 'game_id' => $otherGame->id])->assertSessionHasNoErrors();
    expect($this->event->fresh()->game_id)->toBe($otherGame->id);

    Score::factory()->create();

    $this->actingAs($this->admin)->put('/event/testevent', [...$details, 'game_id' => $this->game->id])->assertSessionHasErrors('game_id');
    expect($this->event->fresh()->game_id)->toBe($otherGame->id);
});

it('keeps games for admins only', function () {
    $referee = User::factory()->create();

    $this->actingAs($referee)->get('/games')->assertForbidden();
    $this->actingAs($referee)->postJson("/api/games/{$this->game->id}/score-types", ['name' => 'Goal', 'points' => 5, 'target' => 'team'])->assertForbidden();
    $this->actingAs($referee)->getJson("/api/games/{$this->game->id}/score-types")->assertForbidden();
});

it('copies how each score type is scored when duplicating a game', function () {
    ScoreType::factory()->create(['name' => 'Full base', 'points' => 10, 'kind' => 'choice', 'choice_set' => 'Base', 'target' => 'alliance', 'referee' => 'penalty', 'awarded_to' => 'opponent']);

    $this->actingAs($this->admin)->post('/games', ['name' => 'Copy', 'duplicate_from' => $this->game->id])->assertRedirect();

    expect(Game::query()->where('name', 'Copy')->sole()->scoreTypes()->sole())
        ->kind->toBe(ScoreKind::CHOICE)
        ->choice_set->toBe('Base')
        ->referee->toBe(RefereeRole::PENALTY)
        ->awarded_to->toBe(PointsAwardedTo::OPPONENT);
});
