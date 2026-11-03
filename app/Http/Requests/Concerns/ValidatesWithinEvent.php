<?php

namespace App\Http\Requests\Concerns;

use App\Services\CurrentEvent;
use App\Services\CurrentGame;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;
use Illuminate\Validation\Rules\Unique;

/**
 * Database validation rules bypass Eloquent scopes, so rules that look up
 * event-owned (or game-owned) tables have to be narrowed explicitly.
 */
trait ValidatesWithinEvent
{
    protected function existsInEvent(string $table, string $column = 'id'): Exists
    {
        return Rule::exists($table, $column)->where('event_id', app(CurrentEvent::class)->id());
    }

    protected function uniqueInEvent(string $table, string $column): Unique
    {
        return Rule::unique($table, $column)->where('event_id', app(CurrentEvent::class)->id());
    }

    protected function existsInGame(string $table, string $column = 'id'): Exists
    {
        return Rule::exists($table, $column)->where('game_id', app(CurrentGame::class)->id());
    }

    protected function uniqueInGame(string $table, string $column): Unique
    {
        return Rule::unique($table, $column)->where('game_id', app(CurrentGame::class)->id());
    }
}
