<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Group extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'display_order',
    ];

    public function scoreTypes()
    {
        return $this->hasMany(ScoreType::class);
    }
}
