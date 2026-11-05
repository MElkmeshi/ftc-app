<?php

namespace Database\Factories;

use App\Models\Award;
use App\Models\AwardWinner;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AwardWinner>
 */
class AwardWinnerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'award_id' => Award::factory(),
            'place' => 1,
            'team_id' => Team::factory(),
            'recipient' => null,
        ];
    }
}
