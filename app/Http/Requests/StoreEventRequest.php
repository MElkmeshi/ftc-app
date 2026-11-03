<?php

namespace App\Http\Requests;

use App\Enums\EventType;
use App\Models\Event;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEventRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('code'))) {
            $this->merge(['code' => strtolower(trim($this->input('code')))]);
        }
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'regex:'.Event::CODE_PATTERN, Rule::unique('events', 'code')],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::enum(EventType::class)],
            'venue' => ['nullable', 'string', 'max:255'],
            'timezone' => ['required', 'timezone:all'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'field_count' => ['required', 'integer', 'min:1', 'max:8'],
            'game_id' => ['nullable', 'integer', Rule::exists('games', 'id')],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.regex' => 'Use 2–32 lowercase letters, numbers or underscores (it appears in every URL).',
        ];
    }
}
