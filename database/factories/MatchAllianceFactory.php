<?php

namespace Database\Factories;

use App\Models\Alliance;
use App\Models\CompetitionMatch;
use App\Models\MatchAlliance;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

class MatchAllianceFactory extends Factory
{
    protected $model = MatchAlliance::class;

    public function definition()
    {
        return [
            'match_id' => CompetitionMatch::factory(),
            'team_id' => Team::factory(),
            'alliance_id' => Alliance::factory(),
            'alliance_pos' => $this->faker->numberBetween(1, 2),
            'score' => $this->faker->numberBetween(0, 200),
            'counts_for_ranking' => true,
            'created_by' => 1,
            'updated_by' => 1,
        ];
    }
}
