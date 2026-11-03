<?php

namespace App\Http\Requests;

use App\Enums\DisplayMode;
use App\Http\Requests\Concerns\ValidatesWithinEvent;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAudienceDisplayRequest extends FormRequest
{
    use ValidatesWithinEvent;

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'mode' => ['required', Rule::enum(DisplayMode::class)],
            'match_id' => ['nullable', 'integer', $this->existsInEvent('matches')->whereNull('deleted_at')],
        ];
    }
}
