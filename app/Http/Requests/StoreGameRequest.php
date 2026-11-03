<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A new game starts blank, or as a copy of an existing game to tweak.
 */
class StoreGameRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'duplicate_from' => ['nullable', 'integer', Rule::exists('games', 'id')],
        ];
    }
}
