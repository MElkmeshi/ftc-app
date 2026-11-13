<?php

namespace App\Http\Requests;

use App\Enums\MatchType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMatchControlSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('control-matches') ?? false;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'live_scoring' => ['sometimes', 'boolean'],
            'require_ready' => ['sometimes', 'boolean'],
            'referee_tablets' => ['sometimes', 'boolean'],
            'flip_alliances' => ['sometimes', 'boolean'],
            'recorded_countdown' => ['sometimes', 'boolean'],
            'hr_control' => ['sometimes', Rule::in(['none', 'start', 'full'])],
            'active_phase' => ['sometimes', 'nullable', Rule::enum(MatchType::class)],
        ];
    }
}
