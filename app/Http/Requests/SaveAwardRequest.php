<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesWithinEvent;
use Illuminate\Foundation\Http\FormRequest;

/**
 * An award's name, what is read out about it, and whether it goes to a team
 * or to a person.
 */
class SaveAwardRequest extends FormRequest
{
    use ValidatesWithinEvent;

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120', $this->uniqueInEvent('awards', 'name')->ignore($this->route('award'))],
            'description' => ['nullable', 'string', 'max:5000'],
            'is_team_award' => ['required', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Give the award a name.',
            'name.unique' => 'Another award already has this name.',
        ];
    }
}
