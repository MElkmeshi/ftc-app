<?php

namespace App\Http\Requests;

use App\Rules\SafeImage;
use App\Services\GameAssets;
use Illuminate\Foundation\Http\FormRequest;

class SaveSponsorRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'level' => ['nullable', 'string', 'max:60'],
            'logo' => ['nullable', 'file', 'mimes:'.GameAssets::IMAGE_TYPES, 'max:'.GameAssets::MAX_KILOBYTES, new SafeImage],
        ];
    }
}
