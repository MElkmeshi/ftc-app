<?php

namespace App\Http\Requests;

use App\Enums\InspectionStatus;
use App\Services\InspectionChecklist;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * What an inspector saves for one team: the ticked checklist items, notes
 * and the result. A robot passes only with every item ticked, and an
 * incomplete inspection needs a note telling the team what to fix.
 */
class SaveInspectionRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'checked' => ['present', 'array'],
            'checked.*' => ['string', 'distinct', Rule::in($this->checklist())],
            'notes' => ['nullable', 'string', 'max:2000', Rule::requiredIf($this->input('status') === InspectionStatus::Incomplete->value)],
            'status' => ['required', Rule::enum(InspectionStatus::class)],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty() || $this->input('status') !== InspectionStatus::Passed->value) {
                    return;
                }

                if (array_diff($this->checklist(), $this->input('checked', [])) !== []) {
                    $validator->errors()->add('status', 'Tick every checklist item before passing the robot.');
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['notes.required' => 'Say what the team needs to fix before marking the inspection incomplete.'];
    }

    /**
     * @return list<string>
     */
    private function checklist(): array
    {
        return app(InspectionChecklist::class)->items();
    }
}
