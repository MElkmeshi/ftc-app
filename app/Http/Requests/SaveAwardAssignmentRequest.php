<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesWithinEvent;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Who is given one slot of an award: a team by its number, a person's name
 * and the judges' comments. Everything left empty clears the slot.
 */
class SaveAwardAssignmentRequest extends FormRequest
{
    use ValidatesWithinEvent;

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'team' => ['nullable', 'integer', $this->existsInEvent('teams', 'number')->whereNull('deleted_at')],
            'name' => ['nullable', 'string', 'max:120'],
            'comment' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['team.exists' => 'Team :input is not in this event.'];
    }
}
