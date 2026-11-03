<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesWithinEvent;
use Illuminate\Foundation\Http\FormRequest;

class StoreTeamRequest extends FormRequest
{
    use ValidatesWithinEvent;

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'number' => ['required', 'integer', $this->uniqueInEvent('teams', 'number')],
            'name' => ['required', 'string', 'max:255'],
        ];
    }
}
