<?php

namespace Database\Factories;

use App\Models\CompetitionMatch;
use App\Models\MatchNote;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MatchNote>
 */
class MatchNoteFactory extends Factory
{
    public function definition(): array
    {
        return [
            'match_id' => CompetitionMatch::factory(),
            'summary' => fake()->sentence(4),
            'detail' => null,
            'teams' => [],
        ];
    }
}
