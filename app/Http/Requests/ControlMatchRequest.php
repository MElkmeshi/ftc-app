<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ControlMatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('control-matches') ?? false;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'match_id' => ['required', 'integer', Rule::exists('matches', 'id')->whereNull('deleted_at')],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'match_id.exists' => 'The selected match is unavailable.',
        ];
    }
}
