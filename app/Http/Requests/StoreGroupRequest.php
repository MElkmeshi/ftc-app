<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesWithinEvent;
use Illuminate\Foundation\Http\FormRequest;

class StoreGroupRequest extends FormRequest
{
    use ValidatesWithinEvent;

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', $this->uniqueInGame('groups', 'name')],
            'description' => ['nullable', 'string'],
            'display_order' => ['required', 'integer'],
        ];
    }
}
