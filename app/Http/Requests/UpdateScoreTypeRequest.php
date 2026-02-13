<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateScoreTypeRequest extends FormRequest
{
    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'points' => ['required', 'integer'],
            'target' => ['required', 'in:team,alliance'],
            'group_id' => ['nullable', 'exists:groups,id'],
        ];
    }
}
