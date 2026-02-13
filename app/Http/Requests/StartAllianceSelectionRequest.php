<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StartAllianceSelectionRequest extends FormRequest
{
    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'number_of_alliances' => ['required', 'integer', 'in:2,4'],
        ];
    }
}
