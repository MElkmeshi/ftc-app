<?php

namespace App\Models\Concerns;

use App\Models\Game;
use App\Services\CurrentGame;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/**
 * Scopes a model to the current game (the game being edited, or the game the
 * current event plays): queries only see that game's rows, and new rows are
 * stamped with it automatically.
 *
 * With no current game (console commands, queued jobs) queries are not
 * filtered, so cross-game maintenance code keeps working.
 */
trait BelongsToGame
{
    public static function bootBelongsToGame(): void
    {
        static::addGlobalScope('game', function (Builder $query): void {
            $gameId = app(CurrentGame::class)->id();

            if ($gameId !== null) {
                $query->where($query->getModel()->qualifyColumn('game_id'), $gameId);
            }
        });
    }

    /**
     * Stamps the current game on insert. This is done here rather than in a
     * `creating` listener so it still happens when model events are faked.
     */
    protected function performInsert(Builder $query): bool
    {
        if ($this->getAttribute('game_id') === null) {
            $this->setAttribute('game_id', app(CurrentGame::class)->id()
                ?? throw new LogicException('Cannot create '.class_basename($this).' without a current game.'));
        }

        return parent::performInsert($query);
    }

    /**
     * @return BelongsTo<Game, $this>
     */
    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }
}
