<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreScoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('score-matches') ?? false;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'match_id' => ['required', 'integer', Rule::exists('matches', 'id')->whereNull('deleted_at')],
            'team_id' => ['nullable', 'integer', 'required_without:alliance_id', 'prohibits:alliance_id', Rule::exists('teams', 'id')->whereNull('deleted_at')],
            'alliance_id' => ['nullable', 'integer', 'required_without:team_id', 'prohibits:team_id', 'exists:alliances,id'],
            'score_type_id' => ['required', 'integer', 'exists:score_types,id'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'team_id.prohibits' => 'Choose either a team or an alliance, not both.',
            'alliance_id.prohibits' => 'Choose either a team or an alliance, not both.',
            'team_id.required_without' => 'Select a team or alliance to score.',
            'alliance_id.required_without' => 'Select a team or alliance to score.',
        ];
    }
}
