<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesWithinEvent;
use Illuminate\Foundation\Http\FormRequest;

class RefereeSeatRequest extends FormRequest
{
    use ValidatesWithinEvent;

    public function authorize(): bool
    {
        return $this->user()?->can('score-matches') ?? false;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'tablet_id' => ['required', 'uuid'],
            'match_id' => ['required', 'integer', $this->existsInEvent('matches')->whereNull('deleted_at')],
            'alliance_id' => ['nullable', 'integer', 'exists:alliances,id'],
        ];
    }
}
