<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEvent;
use App\Services\GameAssets;
use Database\Factories\SponsorFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A sponsor of the event, shown on the audience display between matches
 * like FTC Live's "Show Sponsors" screen.
 */
class Sponsor extends Model
{
    /** @use HasFactory<SponsorFactory> */
    use BelongsToEvent, HasFactory;

    protected $fillable = ['event_id', 'name', 'level', 'logo_path', 'position'];

    protected $hidden = ['event_id', 'logo_path', 'created_at', 'updated_at'];

    protected $appends = ['logo_url'];

    protected function logoUrl(): Attribute
    {
        return Attribute::get(fn (): ?string => GameAssets::url($this->logo_path));
    }
}
