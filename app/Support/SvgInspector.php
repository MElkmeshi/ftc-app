<?php

namespace App\Support;

/**
 * Uploaded SVGs are shown on displays and tablets, so they must be pictures
 * only. An SVG is rejected when it could run code or pull in anything from
 * elsewhere: script elements, event handler attributes, javascript: links,
 * embedded HTML, external references or XML entity tricks.
 *
 * The app also only ever shows uploads through <img>, where browsers do not
 * run SVG scripts anyway; this check is the second line of defence.
 */
class SvgInspector
{
    /**
     * @var array<string, string>
     */
    private const FORBIDDEN_PATTERNS = [
        '/<\s*script\b/i' => 'contains a script',
        '/<\s*(foreignObject|iframe|embed|object|audio|video|handler|listener)\b/i' => 'embeds other content',
        '/\son[a-z]+\s*=/i' => 'has an event handler attribute',
        '/javascript\s*:/i' => 'has a javascript: link',
        '/<!\s*(ENTITY|DOCTYPE)\b/i' => 'declares XML entities',
        '/<\?xml-stylesheet\b/i' => 'loads a stylesheet',
        '/(?:xlink:)?href\s*=\s*["\']\s*(?!#|data:image\/(?:png|jpe?g|gif|webp);)[^"\']+["\']/i' => 'links to something outside the file',
        '/@import\b/i' => 'imports a stylesheet',
        '/url\(\s*["\']?\s*(?!#|data:image\/(?:png|jpe?g|gif|webp);)/i' => 'loads something outside the file',
    ];

    /**
     * Why the SVG is unsafe, or null when it is a plain picture.
     */
    public function problem(string $contents): ?string
    {
        if (! preg_match('/<\s*svg\b/i', $contents)) {
            return 'is not an SVG image';
        }

        foreach (self::FORBIDDEN_PATTERNS as $pattern => $reason) {
            if (preg_match($pattern, $contents)) {
                return $reason;
            }
        }

        return null;
    }
}
