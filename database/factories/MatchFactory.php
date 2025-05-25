<?php

namespace Database\Factories;

use App\Enums\MatchStatus;
use App\Models\CompetitionMatch;
use Illuminate\Database\Eloquent\Factories\Factory;

class MatchFactory extends Factory
{
    protected $model = CompetitionMatch::class;

    public function definition()
    {
        return [
            'match_number' => $this->faker->unique()->numberBetween(1, 1000),
            'start_time' => $this->faker->dateTimeBetween('-1 week', '+1 week'),
            'status' => $this->faker->randomElement(collect(MatchStatus::cases())->pluck('value')),
            'created_by' => 1,
            'updated_by' => 1,
        ];
    }
}
