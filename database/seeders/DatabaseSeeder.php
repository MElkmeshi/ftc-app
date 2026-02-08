<?php

namespace Database\Seeders;

use App\Models\Alliance;
use App\Models\Group;
use App\Models\ScoreType;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        $admin = User::factory()->create(['email' => 'elkmeshi2002@gmail.com']);

        $red = Alliance::create(['color' => 'red']);
        $blue = Alliance::create(['color' => 'blue']);

        $autonomous = Group::create([
            'name' => 'autonomous',
            'description' => 'Autonomous period scoring',
            'display_order' => 1,
        ]);

        $teleop = Group::create([
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
