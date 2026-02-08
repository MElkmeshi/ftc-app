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
            'name' => $this->faker->unique()->randomElement(['score', 'minor_penalty', 'major_penalty', 'bonus']),
            'points' => $this->faker->randomElement([1, -10, -30, 20]),
            'created_by' => 1,
            'updated_by' => 1,
        ];
    }

    public function withGroup()
    {
        return $this->state(fn () => [
            'group_id' => Group::factory(),
        ]);
    }
}
