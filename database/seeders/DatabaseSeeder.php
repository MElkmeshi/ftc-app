<?php

namespace Database\Seeders;

use App\Models\Alliance;
use App\Models\Event;
use App\Models\Game;
use App\Models\Group;
use App\Models\ScoreType;
use App\Models\Team;
use App\Models\User;
use App\Services\CurrentEvent;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::factory()->admin()->create(['email' => 'elkmeshi2002@gmail.com']);

        Alliance::create(['color' => 'red']);
        Alliance::create(['color' => 'blue']);

        $game = Game::query()->create(['name' => 'Sample game', 'created_by' => $admin->id]);
        $event = Event::factory()->create(['game_id' => $game->id, 'code' => 'main', 'name' => 'Main event', 'created_by' => $admin->id]);

        app(CurrentEvent::class)->using($event, fn () => $this->seedEventRows($admin));
    }

    private function seedEventRows(User $admin): void
    {
        Group::create([
            'name' => 'autonomous',
            'description' => 'Autonomous period scoring',
            'display_order' => 1,
        ]);

        Group::create([
            'name' => 'teleop',
            'description' => 'Teleoperated period scoring',
            'display_order' => 2,
        ]);

        $scoreTypes = [
            ['name' => 'score', 'points' => 1, 'created_by' => $admin->id],
            ['name' => 'minor_penalty', 'points' => -10, 'created_by' => $admin->id],
            ['name' => 'major_penalty', 'points' => -30, 'created_by' => $admin->id],
            ['name' => 'bonus', 'points' => 20, 'created_by' => $admin->id],
        ];
        foreach ($scoreTypes as $type) {
            ScoreType::create($type);
        }

        Team::factory(8)->create(['created_by' => $admin->id]);
    }
}
