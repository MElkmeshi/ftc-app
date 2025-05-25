<?php

namespace Database\Factories;

use App\Models\CompetitionMatch;
use App\Models\Score;
use App\Models\ScoreType;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

class ScoreFactory extends Factory
{
    protected $model = Score::class;

    public function definition()
    {
        return [
            'match_id' => CompetitionMatch::factory(),
            'team_id' => Team::factory(),
            'score_type_id' => ScoreType::factory(),
            'points' => $this->faker->numberBetween(-30, 100),
            'created_by' => 1,
            'updated_by' => 1,
        ];
    }
}
