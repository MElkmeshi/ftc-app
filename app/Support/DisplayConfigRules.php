<?php

namespace App\Support;

/**
 * The settings a display screen can have, shared by the requests that report and change them.
 */
class DisplayConfigRules
{
    public const TYPES = ['audience', 'field', 'pit', 'overlay', 'sponsor'];

    public const KEYS = ['type', 'mute', 'flipped', 'field', 'name', 'color'];

    /**
     * @return array<string, list<string>>
     */
    public static function rules(bool $required): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'type' => [$presence, 'string', 'in:'.implode(',', self::TYPES)],
            'mute' => [$presence, 'boolean'],
            'flipped' => [$presence, 'boolean'],
            'field' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:8'],
            'name' => ['sometimes', 'nullable', 'string', 'max:40'],
            'color' => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ];
    }
}
