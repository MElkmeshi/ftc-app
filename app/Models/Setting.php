<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['group', 'name', 'locked', 'payload'];

    protected function casts(): array
    {
        return [
            'locked' => 'boolean',
            'payload' => 'json',
        ];
    }

    /**
     * Get a setting value by group and name
     */
    public static function get(string $group, string $name, mixed $default = null): mixed
    {
        $setting = static::where('group', $group)
            ->where('name', $name)
            ->first();

        return $setting ? $setting->payload : $default;
    }

    /**
     * Set a setting value by group and name
     */
    public static function set(string $group, string $name, mixed $value): void
    {
        static::updateOrCreate(
            ['group' => $group, 'name' => $name],
            ['payload' => $value]
        );
    }
}
