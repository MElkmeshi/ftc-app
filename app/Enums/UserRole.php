<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case HeadReferee = 'head_referee';
    case Referee = 'referee';
    case Inspector = 'inspector';
    case Viewer = 'viewer';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Admin / Scorekeeper',
            self::HeadReferee => 'Head Referee',
            self::Referee => 'Referee',
            self::Inspector => 'Inspector',
            self::Viewer => 'Viewer',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Admin => 'Sets up events, runs match control and edits everything.',
            self::HeadReferee => 'Starts and stops matches and commits scores.',
            self::Referee => 'Scores matches from a tablet.',
            self::Inspector => 'Inspects robots and records the results.',
            self::Viewer => 'Can sign in but only sees public pages.',
        };
    }

    /**
     * @return list<array{value: string, label: string, description: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $role): array => ['value' => $role->value, 'label' => $role->label(), 'description' => $role->description()],
            self::cases(),
        );
    }
}
