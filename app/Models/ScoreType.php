<?php

namespace App\Models;

use App\Enums\ScoreTarget;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScoreType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'points', 'target', 'created_by',
    ];

    protected $hidden = [
        'created_by', 'updated_by', 'deleted_at', 'created_at', 'updated_at',
    ];

    protected $casts = [
        'target' => ScoreTarget::class,
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
