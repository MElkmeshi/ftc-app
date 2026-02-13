<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTeamRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'number' => ['required', 'integer', Rule::unique('teams', 'number')->ignore($this->route('team'))],
            'name' => ['required', 'string', 'max:255'],
        ];
    }
}
