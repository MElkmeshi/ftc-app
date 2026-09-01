<?php

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->create(['id' => 1]);
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
    Setting::set('competition', 'autonomous', 45);

    $response = $this->deleteJson('/api/settings/competition/reset');

    $response->assertSuccessful();
    expect(Setting::where('group', 'competition')->count())->toBe(0);
});
