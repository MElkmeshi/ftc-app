<?php

namespace App\Services;

use App\Models\Game;
use LogicException;

/**
 * Holds the game the current request is working on: the game being edited
 * on a `/games/{game}` page, or otherwise the game the current event plays.
 * Game-owned models (score groups and score types) read it to filter
 * queries and to stamp new rows.
 */
class CurrentGame
{
    private ?Game $game = null;

    public function __construct(private CurrentEvent $currentEvent) {}

    public function set(?Game $game): void
    {
        $this->game = $game;
    }

    public function get(): ?Game
    {
        if ($this->game !== null) {
            return $this->game;
        }

        $event = $this->currentEvent->get();

        if ($event === null || $event->game_id === null) {
            return null;
        }

        if ($event->relationLoaded('game') && $event->getRelation('game')?->id !== $event->game_id) {
            $event->unsetRelation('game');
        }

        return $event->game;
    }

    public function id(): ?int
    {
        return $this->game?->id ?? $this->currentEvent->get()?->game_id;
    }

    public function require(): Game
    {
        return $this->get() ?? throw new LogicException('No game is selected for this request.');
    }

    /**
     * Run a callback with a different current game, restoring the previous one afterwards.
     *
     * @template TReturn
     *
     * @param  callable(): TReturn  $callback
     * @return TReturn
     */
    public function using(Game $game, callable $callback): mixed
    {
        $previous = $this->game;
        $this->game = $game;

        try {
            return $callback();
        } finally {
            $this->game = $previous;
        }
    }
}
