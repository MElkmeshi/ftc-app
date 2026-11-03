<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateScheduleTimingRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'first_match_at' => ['required', 'date_format:Y-m-d\TH:i'],
            'cycle_minutes' => ['required', 'integer', 'min:1', 'max:60'],
            'breaks' => ['array', 'max:10'],
            'breaks.*.after_match' => ['required', 'integer', 'min:1'],
            'breaks.*.minutes' => ['required', 'integer', 'min:1', 'max:600'],
        ];
    }
}
