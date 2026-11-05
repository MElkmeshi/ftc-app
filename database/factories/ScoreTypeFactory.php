<?php

namespace Database\Factories;

use App\Models\Group;
use App\Models\ScoreType;
use Illuminate\Database\Eloquent\Factories\Factory;

class ScoreTypeFactory extends Factory
{
    protected $model = ScoreType::class;

    public function definition()
    {
        return [
            'name' => $this->faker->unique()->randomElement(['score', 'park', 'goal', 'bonus']),
            'points' => $this->faker->randomElement([1, 5, 10, 20]),
            'created_by' => 1,
        ];
    }

    public function foul(int $points = 5)
    {
        return $this->state(fn () => [
            'name' => $this->faker->unique()->randomElement(['Minor foul', 'Major foul', 'Tech foul']),
            'points' => $points,
            'target' => 'alliance',
            'referee' => 'penalty',
            'awarded_to' => 'opponent',
        ]);
    }

    public function withGroup()
    {
        return $this->state(fn () => [
            'group_id' => Group::factory(),
        ]);
    }
}
