<?php

namespace App\Http\Requests\Concerns;

use App\Enums\ScoreKind;
use Illuminate\Validation\Rule;

/**
 * Validation for a score type's kind. A "one of" score type names the set it
 * belongs to; other kinds never keep a set name.
 */
trait ValidatesScoreKind
{
    protected function prepareForValidation(): void
    {
        if ($this->has('kind') && $this->input('kind') !== ScoreKind::CHOICE->value) {
            $this->merge(['choice_set' => null]);
        }

        if (is_string($this->input('choice_set'))) {
            $this->merge(['choice_set' => trim($this->input('choice_set'))]);
        }
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    protected function scoreKindRules(): array
    {
        return [
            'kind' => ['sometimes', Rule::enum(ScoreKind::class)],
            'choice_set' => ['nullable', 'required_if:kind,'.ScoreKind::CHOICE->value, 'string', 'max:100'],
        ];
    }
}
