<?php

namespace Database\Factories;

use App\Enums\RankingMethod;
use App\Models\Game;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Game>
 */
class GameFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true).' game',
            'description' => null,
            'timing' => null,
            'ranking_method' => RankingMethod::TotalScore,
        ];
    }
}
