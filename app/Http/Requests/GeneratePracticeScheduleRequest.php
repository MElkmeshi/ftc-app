<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GeneratePracticeScheduleRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'matches_per_team' => ['required', 'integer', 'min:1', 'max:10'],
            'teams_per_alliance' => ['required', 'integer', 'min:1', 'max:4'],
            'first_match_at' => ['required', 'date_format:Y-m-d\TH:i'],
            'cycle_minutes' => ['required', 'integer', 'min:1', 'max:60'],
        ];
    }
}
