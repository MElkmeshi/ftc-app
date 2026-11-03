<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GenerateScheduleRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'matches_per_team' => ['required', 'integer', 'min:1'],
            'teams_per_alliance' => ['required', 'integer', 'min:1'],
            'max_scoring_matches' => ['nullable', 'integer', 'min:1'],
            'first_match_at' => ['nullable', 'date_format:Y-m-d\TH:i'],
            'cycle_minutes' => ['nullable', 'integer', 'min:1', 'max:60'],
            'breaks' => ['array', 'max:10'],
            'breaks.*.after_match' => ['required', 'integer', 'min:1'],
            'breaks.*.minutes' => ['required', 'integer', 'min:1', 'max:600'],
        ];
    }
}
