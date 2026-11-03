<?php

namespace App\Http\Requests;

use App\Enums\EventType;
use App\Services\CurrentEvent;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * The event code is fixed once created: it is baked into every display,
 * tablet and broadcast channel URL already handed out at the venue.
 */
class UpdateEventRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::enum(EventType::class)],
            'venue' => ['nullable', 'string', 'max:255'],
            'timezone' => ['required', 'timezone:all'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'field_count' => ['required', 'integer', 'min:1', 'max:8'],
            'game_id' => ['sometimes', 'required', 'integer', Rule::exists('games', 'id')],
        ];
    }

    /**
     * Scores point at the game's score types, so once anything has been
     * scored the event has to stay on the game it was scored with.
     *
     * @return array<int, Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $event = app(CurrentEvent::class)->require();

                if ($this->has('game_id') && (int) $this->input('game_id') !== $event->game_id && $event->hasScores()) {
                    $validator->errors()->add('game_id', 'This event already has scores, so its game can no longer be changed. Edit the game itself instead.');
                }
            },
        ];
    }
}
