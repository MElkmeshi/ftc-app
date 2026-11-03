<?php

namespace Database\Factories;

use App\Enums\EventType;
use App\Models\Event;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Event>
 */
class EventFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => fake()->unique()->regexify('[a-z]{4}[0-9]{2}'),
            'name' => fake()->city().' Scrimmage',
            'type' => EventType::Scrimmage,
            'venue' => fake()->company(),
            'timezone' => 'UTC',
            'start_date' => now()->toDateString(),
            'end_date' => now()->toDateString(),
            'field_count' => 1,
        ];
    }

    public function archived(): static
    {
        return $this->state(fn (): array => ['archived_at' => now()]);
    }
}
