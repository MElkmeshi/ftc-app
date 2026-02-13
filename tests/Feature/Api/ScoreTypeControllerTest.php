<?php

use App\Models\Group;
use App\Models\ScoreType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->create(['id' => 1]);
    $this->actingAs(User::find(1));
});

it('lists score types with groups', function () {
    $group = Group::factory()->create();
    ScoreType::factory()->create(['name' => 'score', 'group_id' => $group->id]);

    $response = $this->getJson('/api/score-types');

    $response->assertSuccessful();
    $data = $response->json();
    expect($data)->toHaveCount(1);
    expect($data[0]['group'])->not->toBeNull();
});

it('creates a score type', function () {
    $response = $this->postJson('/api/score-types', [
        'name' => 'Basket Score',
        'points' => 5,
        'target' => 'team',
        'group_id' => null,
    ]);

    $response->assertCreated();
    expect($response->json('name'))->toBe('Basket Score');
    expect($response->json('points'))->toBe(5);
    expect($response->json('target'))->toBe('team');
});

it('creates a score type with group', function () {
    $group = Group::factory()->create();

    $response = $this->postJson('/api/score-types', [
        'name' => 'Grouped Score',
        'points' => 10,
        'target' => 'alliance',
        'group_id' => $group->id,
    ]);

    $response->assertCreated();
    expect($response->json('group_id'))->toBe($group->id);
    expect($response->json('group'))->not->toBeNull();
});

it('validates required fields on create', function () {
    $response = $this->postJson('/api/score-types', []);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['name', 'points', 'target']);
});

it('validates target must be team or alliance', function () {
    $response = $this->postJson('/api/score-types', [
        'name' => 'Bad Target',
        'points' => 1,
        'target' => 'invalid',
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['target']);
});

it('validates group_id must exist', function () {
    $response = $this->postJson('/api/score-types', [
        'name' => 'Bad Group',
        'points' => 1,
        'target' => 'team',
        'group_id' => 9999,
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['group_id']);
});

it('updates a score type', function () {
    $scoreType = ScoreType::factory()->create(['name' => 'score']);

    $response = $this->putJson("/api/score-types/{$scoreType->id}", [
        'name' => 'Updated Score',
        'points' => 15,
        'target' => 'alliance',
        'group_id' => null,
    ]);

    $response->assertSuccessful();
    expect($response->json('name'))->toBe('Updated Score');
    expect($response->json('points'))->toBe(15);
});

it('deletes a score type', function () {
    $scoreType = ScoreType::factory()->create(['name' => 'score']);

    $response = $this->deleteJson("/api/score-types/{$scoreType->id}");

    $response->assertNoContent();
    $this->assertDatabaseMissing('score_types', ['id' => $scoreType->id]);
});
