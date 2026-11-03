<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesWithinEvent;
use Illuminate\Foundation\Http\FormRequest;

class DeclinePickRequest extends FormRequest
{
    use ValidatesWithinEvent;

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'alliance_group_id' => ['required', 'integer', $this->existsInEvent('alliance_groups')],
        ];
    }
}
