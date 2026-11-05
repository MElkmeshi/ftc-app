<?php

namespace App\Http\Requests\Concerns;

use App\Enums\PointsAwardedTo;
use App\Enums\RefereeRole;
use App\Enums\ScoreKind;
use App\Enums\ScoreTarget;
use App\Models\ScoreType;
use Illuminate\Validation\Rule;

/**
 * Validation for how a score type is scored: its kind (a "one of" score type
 * names the set it belongs to), which referee enters it, and its points.
 *
 * A penalty referee's score type is a foul level, as in FTC Live's minor and
 * major fouls: the fouling alliance's referee counts it and its points go to
 * the opponent, so no score type ever takes points away.
 */
trait ValidatesScoreKind
{
    protected function prepareForValidation(): void
    {
        if ($this->isFoulLevel()) {
            $this->merge([
                'target' => ScoreTarget::ALLIANCE->value,
                'kind' => ScoreKind::COUNT->value,
                'choice_set' => null,
                'awarded_to' => PointsAwardedTo::OPPONENT->value,
            ]);

            return;
        }

        $this->merge(['awarded_to' => PointsAwardedTo::OWN->value]);

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
            'points' => ['required', 'integer', 'min:'.($this->isFoulLevel() ? 1 : 0), 'max:10000'],
            'kind' => ['sometimes', Rule::enum(ScoreKind::class)],
            'choice_set' => ['nullable', 'required_if:kind,'.ScoreKind::CHOICE->value, 'string', 'max:100'],
            'referee' => ['sometimes', Rule::enum(RefereeRole::class)],
            'awarded_to' => ['required', Rule::enum(PointsAwardedTo::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'points.min' => $this->isFoulLevel()
                ? 'A foul is worth at least 1 point to the opponent.'
                : 'Points cannot be negative. Add fouls as penalty score types instead: their points go to the opponent.',
        ];
    }

    private function isFoulLevel(): bool
    {
        $scoreType = $this->route('scoreType');
        $referee = $this->input('referee') ?? ($scoreType instanceof ScoreType ? $scoreType->referee?->value : null);

        return $referee === RefereeRole::PENALTY->value;
    }
}
