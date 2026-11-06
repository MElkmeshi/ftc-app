<?php

use App\Enums\MatchStatus;
use App\Enums\MatchType;
use App\Enums\UserRole;
use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    User::factory()->admin()->create(['id' => 1]);
    $this->referee = User::factory()->create(['role' => UserRole::Referee]);
    $alliance = Alliance::create(['name' => 'Red Alliance', 'color' => 'red']);

    $this->match = CompetitionMatch::create([
        'number' => 1, 'type' => MatchType::QUALIFICATION, 'status' => MatchStatus::UPCOMING,
        'start_time' => now(), 'created_by' => 1, 'updated_by' => 1,
    ]);
    $this->teams = Team::factory()->count(2)->create();

    foreach ($this->teams as $position => $team) {
        MatchAlliance::create([
            'match_id' => $this->match->id, 'team_id' => $team->id, 'alliance_id' => $alliance->id,
            'alliance_pos' => $position + 1, 'score' => 0, 'created_by' => 1, 'updated_by' => 1,
        ]);
    }
});

it('marks one team ready without touching the others in the match', function () {
    $this->actingAs($this->referee)
        ->putJson("/api/matches/{$this->match->id}/ready", ['team_id' => $this->teams[0]->id, 'ready' => true])
        ->assertOk()
        ->assertJsonPath('match.match_alliances.0.ready', true)
        ->assertJsonPath('match.match_alliances.1.ready', false);

    $this->actingAs($this->referee)
        ->putJson("/api/matches/{$this->match->id}/ready", ['team_id' => $this->teams[0]->id, 'ready' => false])
        ->assertOk();

    expect(MatchAlliance::query()->where('team_id', $this->teams[0]->id)->value('ready'))->toBeFalse();
});

it('refuses a team that is not in the match or a match that is over', function () {
    $this->actingAs($this->referee)
        ->putJson("/api/matches/{$this->match->id}/ready", ['team_id' => Team::factory()->create()->id, 'ready' => true])
        ->assertJsonValidationErrors('team_id');

    $this->match->update(['status' => MatchStatus::COMPLETED]);

    $this->actingAs($this->referee)
        ->putJson("/api/matches/{$this->match->id}/ready", ['team_id' => $this->teams[0]->id, 'ready' => true])
        ->assertJsonValidationErrors('ready');
});

it('keeps marking teams ready to referees', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);

    $this->actingAs($viewer)
        ->putJson("/api/matches/{$this->match->id}/ready", ['team_id' => $this->teams[0]->id, 'ready' => true])
        ->assertForbidden();
});
