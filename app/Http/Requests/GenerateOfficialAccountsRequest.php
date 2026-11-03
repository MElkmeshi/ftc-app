<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GenerateOfficialAccountsRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'head_referees' => ['required', 'integer', 'min:0', 'max:4'],
            'referees' => ['required', 'integer', 'min:0', 'max:16'],
        ];
    }
}
