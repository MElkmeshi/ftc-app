<?php

namespace App\Http\Requests;

use App\Rules\SafeImage;
use App\Services\GameAssets;
use Illuminate\Foundation\Http\FormRequest;

class UploadGameImageRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'image' => ['required', 'file', 'mimes:'.GameAssets::IMAGE_TYPES, 'max:'.GameAssets::MAX_KILOBYTES, new SafeImage],
        ];
    }
}
