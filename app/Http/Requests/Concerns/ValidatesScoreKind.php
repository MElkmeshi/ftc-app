<?php

namespace App\Http\Requests\Concerns;

use App\Enums\PointsAwardedTo;
use App\Enums\RefereeRole;
use App\Enums\ScoreKind;
use Illuminate\Validation\Rule;

/**
 * Validation for how a score type is scored: its kind (a "one of" score type
 * names the set it belongs to), which referee enters it, and who gets its points.
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
            'referee' => ['sometimes', Rule::enum(RefereeRole::class)],
            // Points for the opponent belong to the whole alliance, not to one of the fouling robots.
            'awarded_to' => ['sometimes', Rule::enum(PointsAwardedTo::class), Rule::when(
                $this->input('target') === 'team',
                [Rule::in([PointsAwardedTo::OWN->value])],
            )],
        ];
    }
}
