<?php

namespace App\Http\Requests;

/**
 * Sets how many times a score type is scored for one robot or alliance. The
 * request carries the absolute count, so resending it never double-counts.
 */
class SetScoreCountRequest extends StoreScoreRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'count' => ['required', 'integer', 'min:0', 'max:999'],
        ];
    }
}
