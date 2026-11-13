<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesWithinEvent;
use Illuminate\Foundation\Http\FormRequest;

class StoreMatchNoteRequest extends FormRequest
{
    use ValidatesWithinEvent;

    public function authorize(): bool
    {
        return $this->user()?->can('control-matches') ?? false;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'match_id' => ['required', 'integer', $this->existsInEvent('matches')->whereNull('deleted_at')],
            'summary' => ['required', 'string', 'max:255'],
            'detail' => ['nullable', 'string', 'max:5000'],
            'teams' => ['nullable', 'array'],
            'teams.*' => ['string', 'max:20'],
        ];
    }
}
