<?php

use App\Enums\RankingMethod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->admin()->create(['id' => 1]);
    $this->actingAs(User::find(1));
});

it('returns config defaults when no settings are stored', function () {
    $response = $this->getJson('/api/settings/competition');

    $response->assertSuccessful();
    expect($response->json('timing.autonomous'))->toBe(config('competition.timing.autonomous'));
});

it('persists competition settings and returns them on the next fetch', function () {
    $response = $this->putJson('/api/settings/competition', [
        'pre_match_countdown' => 5,
        'autonomous' => 45,
        'transition' => 10,
        'teleop' => 100,
        'endgame_warning' => 25,
        'controllers_warning_offset' => 1,
    ]);

    $response->assertSuccessful();

    $this->getJson('/api/settings/competition')
        ->assertSuccessful()
        ->assertJsonPath('timing.autonomous', 45)
        ->assertJsonPath('timing.teleop', 100);
});

it('rejects invalid competition settings', function () {
    $response = $this->putJson('/api/settings/competition', [
        'pre_match_countdown' => -1,
        'autonomous' => 45,
        'transition' => 10,
        'teleop' => 100,
        'endgame_warning' => 25,
        'controllers_warning_offset' => 1,
    ]);

    $response->assertStatus(422);
});

it('resets competition settings back to config defaults', function () {
    $this->event->game->update(['timing' => ['autonomous' => 45]]);

    $response = $this->deleteJson('/api/settings/competition/reset');

    $response->assertSuccessful();
    expect($this->event->game->fresh()->timing)->toBeNull();
});

it('lets admins choose how rankings are ordered', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->put('/api/ranking-method', ['method' => 'record'])->assertRedirect();
    expect($this->event->game->fresh()->ranking_method)->toBe(RankingMethod::Record);

    $this->actingAs($admin)->put('/api/ranking-method', ['method' => 'coin_flip'])->assertSessionHasErrors('method');
    $this->actingAs(User::factory()->create())->put('/api/ranking-method', ['method' => 'total_score'])->assertForbidden();
});
