<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GenerateScheduleRequest extends FormRequest
{
    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'matches_per_team' => ['required', 'integer', 'min:1'],
            'teams_per_alliance' => ['required', 'integer', 'min:1'],
        ];
    }
}
