<?php

use App\Enums\RankingMethod;
use App\Models\Event;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;

uses(DatabaseMigrations::class);

it('turns each event\'s own game into a game the event plays', function () {
    $migration = require glob(database_path('migrations/*move_game_definitions_into_games.php'))[0];
    $migration->down();

    $eventId = $this->event->id;
    $groupId = DB::table('groups')->insertGetId(['event_id' => $eventId, 'name' => 'Autonomous', 'display_order' => 1]);
    DB::table('score_types')->insert(['event_id' => $eventId, 'name' => 'Park', 'points' => 3, 'target' => 'team', 'group_id' => $groupId]);
    DB::table('settings')->where('event_id', $eventId)->where('group', 'ranking')->update(['payload' => json_encode('record')]);
    DB::table('settings')->insert([
        ['event_id' => $eventId, 'group' => 'competition', 'name' => 'teleop', 'locked' => false, 'payload' => json_encode(90)],
        ['event_id' => $eventId, 'group' => 'schedule', 'name' => 'timing', 'locked' => false, 'payload' => json_encode(['cycle_minutes' => 7])],
    ]);

    $migration->up();

    $game = Event::query()->findOrFail($eventId)->game;

    expect($game)
        ->name->toBe($this->event->name.' game')
        ->timing->toBe(['teleop' => 90])
        ->ranking_method->toBe(RankingMethod::Record)
        ->and($game->scoreTypes()->sole())->name->toBe('Park')->group_id->toBe($groupId)
        ->and($game->groups()->sole()->name)->toBe('Autonomous')
        ->and(DB::table('settings')->where('event_id', $eventId)->pluck('group')->all())->toBe(['schedule']);
});
