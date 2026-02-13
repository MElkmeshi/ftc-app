<?php

use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->create(['id' => 1]);
    $this->actingAs(User::find(1));
});

it('lists teams ordered by number', function () {
    Team::factory()->create(['number' => 200, 'name' => 'Beta']);
    Team::factory()->create(['number' => 100, 'name' => 'Alpha']);

    $response = $this->getJson('/api/teams');

    $response->assertSuccessful();
    $data = $response->json();
    expect($data)->toHaveCount(2);
    expect($data[0]['number'])->toBe(100);
    expect($data[1]['number'])->toBe(200);
});

it('creates a team', function () {
    $response = $this->postJson('/api/teams', [
        'number' => 1234,
        'name' => 'Test Robotics',
    ]);

    $response->assertCreated();
    expect($response->json('number'))->toBe(1234);
    expect($response->json('name'))->toBe('Test Robotics');

    $this->assertDatabaseHas('teams', [
        'number' => 1234,
        'name' => 'Test Robotics',
    ]);
});

it('validates required fields on create', function () {
    $response = $this->postJson('/api/teams', []);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['number', 'name']);
});

it('validates unique team number on create', function () {
    Team::factory()->create(['number' => 1234]);

    $response = $this->postJson('/api/teams', [
        'number' => 1234,
        'name' => 'Duplicate',
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['number']);
});

it('updates a team', function () {
    $team = Team::factory()->create(['number' => 1000, 'name' => 'Old Name']);

    $response = $this->putJson("/api/teams/{$team->id}", [
        'number' => 2000,
        'name' => 'New Name',
    ]);

    $response->assertSuccessful();
    expect($response->json('number'))->toBe(2000);
    expect($response->json('name'))->toBe('New Name');
});

it('allows keeping the same number on update', function () {
    $team = Team::factory()->create(['number' => 1000, 'name' => 'Team A']);

    $response = $this->putJson("/api/teams/{$team->id}", [
        'number' => 1000,
        'name' => 'Updated Name',
    ]);

    $response->assertSuccessful();
});

it('prevents duplicate number on update', function () {
    Team::factory()->create(['number' => 1000]);
    $team = Team::factory()->create(['number' => 2000]);

    $response = $this->putJson("/api/teams/{$team->id}", [
        'number' => 1000,
        'name' => 'Updated',
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['number']);
});

it('soft deletes a team', function () {
    $team = Team::factory()->create();

    $response = $this->deleteJson("/api/teams/{$team->id}");

    $response->assertNoContent();
    $this->assertSoftDeleted('teams', ['id' => $team->id]);
});
