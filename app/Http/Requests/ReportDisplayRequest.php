<?php

namespace App\Http\Requests;

use App\Support\DisplayConfigRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * A display screen reporting that it is open and what it is set to show.
 * Displays are public pages, so anyone may report.
 */
class ReportDisplayRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'display_id' => ['required', 'uuid'],
            ...DisplayConfigRules::rules(required: true),
        ];
    }
}
