<?php

use App\Models\Alliance;
use App\Models\AllianceGroup;
use App\Models\EliminationSeries;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->create(['id' => 1]);
    $this->actingAs(User::find(1));

    if (Alliance::count() < 2) {
        Alliance::create(['name' => 'Red Alliance', 'color' => 'red']);
        Alliance::create(['name' => 'Blue Alliance', 'color' => 'blue']);
    }
});

it('generates elimination bracket via API', function () {
    $teams = Team::factory()->count(4)->create();

    AllianceGroup::create([
        'seed' => 1,
        'captain_team_id' => $teams[0]->id,
        'picked_team_id' => $teams[1]->id,
        'created_by' => 1,
        'updated_by' => 1,
    ]);

    AllianceGroup::create([
        'seed' => 2,
        'captain_team_id' => $teams[2]->id,
        'picked_team_id' => $teams[3]->id,
        'created_by' => 1,
        'updated_by' => 1,
    ]);

    $response = $this->postJson('/api/elimination/generate');

    $response->assertSuccessful();
    expect(EliminationSeries::count())->toBe(1);
});

it('returns elimination bracket via API', function () {
    $response = $this->getJson('/api/elimination/bracket');

    $response->assertSuccessful();
    $response->assertJsonStructure(['series', 'alliance_groups']);
});

it('rejects generating elimination without alliance groups', function () {
    $response = $this->postJson('/api/elimination/generate');

    $response->assertStatus(422);
});

it('resets elimination data via API', function () {
    $teams = Team::factory()->count(4)->create();

    AllianceGroup::create([
        'seed' => 1,
        'captain_team_id' => $teams[0]->id,
        'picked_team_id' => $teams[1]->id,
        'created_by' => 1,
        'updated_by' => 1,
    ]);

    AllianceGroup::create([
        'seed' => 2,
        'captain_team_id' => $teams[2]->id,
        'picked_team_id' => $teams[3]->id,
        'created_by' => 1,
        'updated_by' => 1,
    ]);

    $this->postJson('/api/elimination/generate')->assertSuccessful();

    $response = $this->deleteJson('/api/elimination/reset');

    $response->assertSuccessful();
    expect(EliminationSeries::count())->toBe(0);
});
