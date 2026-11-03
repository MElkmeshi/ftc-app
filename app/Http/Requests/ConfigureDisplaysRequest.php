<?php

namespace App\Http\Requests;

use App\Support\DisplayConfigRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Match control changing the settings of one or more connected displays.
 * Only the settings that are sent are changed.
 */
class ConfigureDisplaysRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'display_ids' => ['required', 'array', 'min:1', 'max:100'],
            'display_ids.*' => ['required', 'uuid'],
            ...DisplayConfigRules::rules(required: false),
        ];
    }
}
