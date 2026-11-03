<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesScoreKind;
use App\Http\Requests\Concerns\ValidatesWithinEvent;
use Illuminate\Foundation\Http\FormRequest;

class UpdateScoreTypeRequest extends FormRequest
{
    use ValidatesScoreKind, ValidatesWithinEvent;

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'points' => ['required', 'integer'],
            'target' => ['required', 'in:team,alliance'],
            'group_id' => ['nullable', $this->existsInGame('groups')],
            ...$this->scoreKindRules(),
        ];
    }
}
