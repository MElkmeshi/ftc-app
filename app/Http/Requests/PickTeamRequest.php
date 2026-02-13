<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PickTeamRequest extends FormRequest
{
    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'alliance_group_id' => ['required', 'integer', 'exists:alliance_groups,id'],
            'team_id' => ['required', 'integer', 'exists:teams,id'],
        ];
    }
}
