<?php

use App\Models\Group;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->create(['id' => 1]);
    $this->actingAs(User::find(1));
});

it('lists groups ordered by display_order', function () {
    Group::factory()->create(['name' => 'Second', 'display_order' => 2]);
    Group::factory()->create(['name' => 'First', 'display_order' => 1]);

    $response = $this->getJson('/api/groups');

    $response->assertSuccessful();
    $data = $response->json();
    expect($data)->toHaveCount(2);
    expect($data[0]['name'])->toBe('First');
    expect($data[1]['name'])->toBe('Second');
});

it('creates a group', function () {
    $response = $this->postJson('/api/groups', [
        'name' => 'Autonomous',
        'description' => 'Autonomous period scores',
        'display_order' => 1,
    ]);

    $response->assertCreated();
    expect($response->json('name'))->toBe('Autonomous');
    expect($response->json('description'))->toBe('Autonomous period scores');
});

it('validates required fields on create', function () {
    $response = $this->postJson('/api/groups', []);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['name', 'display_order']);
});

it('validates unique group name on create', function () {
    Group::factory()->create(['name' => 'Autonomous']);

    $response = $this->postJson('/api/groups', [
        'name' => 'Autonomous',
        'display_order' => 2,
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['name']);
});

it('updates a group', function () {
    $group = Group::factory()->create(['name' => 'Old Name']);

    $response = $this->putJson("/api/groups/{$group->id}", [
        'name' => 'New Name',
        'description' => 'Updated',
        'display_order' => 5,
    ]);

    $response->assertSuccessful();
    expect($response->json('name'))->toBe('New Name');
    expect($response->json('display_order'))->toBe(5);
});

it('allows keeping the same name on update', function () {
    $group = Group::factory()->create(['name' => 'Keep Me']);

    $response = $this->putJson("/api/groups/{$group->id}", [
        'name' => 'Keep Me',
        'description' => null,
        'display_order' => 1,
    ]);

    $response->assertSuccessful();
});

it('prevents duplicate name on update', function () {
    Group::factory()->create(['name' => 'Existing']);
    $group = Group::factory()->create(['name' => 'Other']);

    $response = $this->putJson("/api/groups/{$group->id}", [
        'name' => 'Existing',
        'display_order' => 1,
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['name']);
});

it('deletes a group', function () {
    $group = Group::factory()->create();

    $response = $this->deleteJson("/api/groups/{$group->id}");

    $response->assertNoContent();
    $this->assertDatabaseMissing('groups', ['id' => $group->id]);
});
