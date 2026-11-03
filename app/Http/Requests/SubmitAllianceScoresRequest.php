<?php

namespace App\Http\Requests;

use App\Enums\RefereeRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'role' => ['sometimes', Rule::enum(RefereeRole::class)],
        ];
    }
}
