<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMatchScoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('control-matches') ?? false;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'match_alliances' => ['required', 'array', 'min:1'],
            'match_alliances.*.id' => ['required', 'integer', 'distinct', Rule::exists('match_alliances', 'id')->where('match_id', $this->route('id'))->whereNull('deleted_at')],
            'match_alliances.*.score' => ['required', 'integer', 'between:-1000000,1000000'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'match_alliances.*.id.exists' => 'Every corrected team must belong to this match.',
            'match_alliances.*.id.distinct' => 'Each team may be corrected only once per request.',
            'match_alliances.*.score.integer' => 'Scores must be whole numbers.',
        ];
    }
}
