<?php

namespace App\Rules;

use App\Support\SvgInspector;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;
use Illuminate\Translation\PotentiallyTranslatedString;

/**
 * Rejects SVG uploads that are more than a picture (see SvgInspector).
 * Pair it with a `mimes` rule; other image types pass through unchanged.
 */
class SafeImage implements ValidationRule
{
    /**
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value instanceof UploadedFile || ! self::isSvg($value)) {
            return;
        }

        $problem = app(SvgInspector::class)->problem((string) $value->get());

        if ($problem !== null) {
            $fail("This SVG {$problem}, so it can't be used. Export it again as a plain image.");
        }
    }

    /**
     * Judged by content as well as name, so an SVG renamed to .png or .html
     * is still inspected.
     */
    public static function isSvg(UploadedFile $file): bool
    {
        return strtolower($file->getClientOriginalExtension()) === 'svg' || str_contains((string) $file->getMimeType(), 'svg');
    }
}
