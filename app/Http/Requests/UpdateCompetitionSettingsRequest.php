<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCompetitionSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage-competition') ?? false;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'pre_match_countdown' => ['required', 'integer', 'min:0', 'max:10'],
            'autonomous' => ['required', 'integer', 'min:0', 'max:60'],
            'transition' => ['required', 'integer', 'min:0', 'max:30'],
            'teleop' => ['required', 'integer', 'min:0', 'max:300'],
            'endgame_warning' => ['required', 'integer', 'min:0', 'max:60'],
            'controllers_warning_offset' => ['required', 'integer', 'min:0', 'max:10'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            '*.required' => 'Each timing setting is required.',
            '*.integer' => 'Timing settings must use whole seconds.',
            '*.min' => 'Timing settings cannot be negative.',
            '*.max' => 'The timing setting exceeds the allowed duration.',
        ];
    }
}
