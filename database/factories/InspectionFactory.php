<?php

namespace Database\Factories;

use App\Enums\InspectionStatus;
use App\Models\Inspection;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Inspection>
 */
class InspectionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'status' => InspectionStatus::NotStarted,
            'checked' => [],
            'notes' => null,
        ];
    }

    public function passed(): static
    {
        return $this->state(['status' => InspectionStatus::Passed]);
    }
}
