<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesWithinEvent;
use Illuminate\Foundation\Http\FormRequest;

class ControlMatchRequest extends FormRequest
{
    use ValidatesWithinEvent;

    public function authorize(): bool
    {
        return $this->user()?->can('control-matches') ?? false;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'match_id' => ['required', 'integer', $this->existsInEvent('matches')->whereNull('deleted_at')],
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
