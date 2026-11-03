<?php

namespace App\Http\Requests;

use App\Enums\EventType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
        ];
    }
}
