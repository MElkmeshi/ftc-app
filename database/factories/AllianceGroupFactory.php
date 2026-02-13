<?php

namespace Database\Factories;

use App\Models\AllianceGroup;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

class AllianceGroupFactory extends Factory
{
    protected $model = AllianceGroup::class;

    public function definition(): array
    {
        return [
            'seed' => $this->faker->unique()->numberBetween(1, 10),
            'captain_team_id' => Team::factory(),
            'picked_team_id' => null,
            'created_by' => 1,
            'updated_by' => 1,
        ];
    }

    public function withPick(): static
    {
        return $this->state(fn () => [
            'picked_team_id' => Team::factory(),
        ]);
    }
}
