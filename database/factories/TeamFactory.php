<?php

namespace Database\Factories;

use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

class TeamFactory extends Factory
{
    protected $model = Team::class;

    public function definition()
    {
        return [
            'number' => $this->faker->unique()->numberBetween(1000, 9999),
            'name' => $this->faker->company.' Robotics',
            'created_by' => 1,
            'updated_by' => 1,
        ];
    }
}
