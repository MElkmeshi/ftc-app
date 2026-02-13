<?php

namespace Database\Factories;

use App\Models\AllianceGroup;
use App\Models\EliminationSeries;
use Illuminate\Database\Eloquent\Factories\Factory;

class EliminationSeriesFactory extends Factory
{
    protected $model = EliminationSeries::class;

    public function definition(): array
    {
        return [
            'round' => 'final',
            'alliance_group_1_id' => AllianceGroup::factory(),
            'alliance_group_2_id' => AllianceGroup::factory(),
            'winner_alliance_group_id' => null,
            'status' => 'pending',
            'created_by' => 1,
            'updated_by' => 1,
        ];
    }
}
