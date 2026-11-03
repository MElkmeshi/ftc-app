<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesWithinEvent;
use Illuminate\Foundation\Http\FormRequest;

class UpdateTeamRequest extends FormRequest
{
    use ValidatesWithinEvent;

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'number' => ['required', 'integer', $this->uniqueInEvent('teams', 'number')->ignore($this->route('team'))],
            'name' => ['required', 'string', 'max:255'],
        ];
    }
}
