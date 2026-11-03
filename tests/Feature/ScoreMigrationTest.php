<?php

use App\Enums\UserRole;
use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\ScoreType;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;

uses(DatabaseMigrations::class);

it('preserves legacy totals and backfills score history including deleted entries', function () {
    $migration = require glob(database_path('migrations/*snapshot_score_points_and_adjustments.php'))[0];
    $migration->down();
    User::factory()->create(['id' => 1]);
    $match = CompetitionMatch::factory()->create();
    $team = Team::factory()->create();
    $alliance = Alliance::create(['color' => 'red']);
    $member = MatchAlliance::create([
        'match_id' => $match->id, 'team_id' => $team->id, 'alliance_id' => $alliance->id,
        'alliance_pos' => 1, 'score' => 17, 'created_by' => 1,
    ]);
    $type = ScoreType::factory()->create(['points' => 10]);
    foreach ([null, now()] as $deletedAt) {
        DB::table('scores')->insert([
            'event_id' => $this->event->id, 'match_id' => $match->id, 'team_id' => $team->id, 'score_type_id' => $type->id,
            'created_by' => 1, 'deleted_at' => $deletedAt,
        ]);
    }

    $migration->up();
    // The later events migration moves pre-existing rows into an event; mimic that backfill here.
    DB::table('scores')->whereNull('event_id')->update(['event_id' => $this->event->id]);

    expect($member->fresh()->score)->toBe(17);
    expect((int) $match->scores()->sum('points'))->toBe(17);
    expect($match->scores()->whereNull('score_type_id')->firstOrFail()->points)->toBe(7);
    expect(DB::table('scores')->whereNotNull('deleted_at')->value('points'))->toBe(10);
});

it('preserves existing operator access while defaulting new accounts to viewers', function () {
    $migration = require glob(database_path('migrations/*add_role_to_users_table.php'))[0];
    $migration->down();
    $existingUser = User::factory()->create();
    $migration->up();
    expect($existingUser->fresh()->role)->toBe(UserRole::Admin);
    expect(User::factory()->create()->fresh()->role)->toBe(UserRole::Viewer);
});
