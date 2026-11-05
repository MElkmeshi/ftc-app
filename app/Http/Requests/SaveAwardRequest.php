<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesWithinEvent;
use App\Models\Award;
use Illuminate\Foundation\Http\FormRequest;

/**
 * An award's name, how many places it has and, once known, who won each
 * place: one or more team numbers (several for an alliance award) and an
 * optional person's name.
 */
class SaveAwardRequest extends FormRequest
{
    use ValidatesWithinEvent;

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $places = (int) $this->input('places', 1);

        return [
            'name' => ['required', 'string', 'max:120', $this->uniqueInEvent('awards', 'name')->ignore($this->route('award'))],
            'description' => ['nullable', 'string', 'max:1000'],
            'places' => ['required', 'integer', 'min:1', 'max:'.Award::MAX_PLACES],
            'winners' => ['sometimes', 'array', 'max:'.Award::MAX_PLACES],
            'winners.*.place' => ['required', 'integer', 'min:1', 'max:'.max(1, $places), 'distinct'],
            'winners.*.teams' => ['present', 'array', 'max:6'],
            'winners.*.teams.*' => ['integer', 'distinct', $this->existsInEvent('teams', 'number')->whereNull('deleted_at')],
            'winners.*.recipient' => ['nullable', 'string', 'max:120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['winners.*.teams.*.exists' => 'Team :input is not in this event.'];
    }
}
