<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitAllianceScoresRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('score-matches') ?? false;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'alliance_id' => ['required', 'integer', 'exists:alliances,id'],
        ];
    }
}
