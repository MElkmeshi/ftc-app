<?php

namespace App\Models;

use App\Enums\ScoreTarget;
use App\Models\Concerns\BelongsToGame;
use App\Services\GameAssets;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class ScoreType extends Model
{
    use BelongsToGame, HasFactory;

    protected $fillable = [
        'game_id', 'name', 'points', 'target', 'group_id', 'icon_path', 'created_by',
    ];

    protected $hidden = [
        'created_by', 'updated_by', 'deleted_at', 'created_at', 'updated_at', 'icon_path',
    ];

    protected $appends = [
        'icon_url',
    ];

    protected static function booted(): void
    {
        static::deleted(function (ScoreType $scoreType): void {
            if ($scoreType->icon_path !== null) {
                Storage::disk(GameAssets::DISK)->delete($scoreType->icon_path);
            }
        });
    }

    /**
     * @return Attribute<?string, never>
     */
    protected function iconUrl(): Attribute
    {
        return Attribute::get(fn (): ?string => GameAssets::url($this->icon_path));
    }

    protected $casts = [
        'target' => ScoreTarget::class,
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function group()
    {
        return $this->belongsTo(Group::class);
    }
}
