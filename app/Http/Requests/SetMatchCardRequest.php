<?php

namespace App\Http\Requests;

use App\Enums\TeamCard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SetMatchCardRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'team_id' => ['required', 'integer'],
            'card' => ['nullable', Rule::enum(TeamCard::class)],
        ];
    }
}
