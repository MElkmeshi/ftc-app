<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SetTeamReadyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('score-matches') ?? false;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'team_id' => ['required', 'integer'],
            'ready' => ['required', 'boolean'],
        ];
    }
}
