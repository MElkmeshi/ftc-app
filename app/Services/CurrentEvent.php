<?php

namespace App\Services;

use App\Models\Event;
use LogicException;

/**
 * Holds the event the current request (or job) is working on. Event-scoped
 * models read it to filter queries and to stamp new rows, so most of the code
 * never has to pass the event around explicitly.
 */
class CurrentEvent
{
    private ?Event $event = null;

    public function set(?Event $event): void
    {
        $this->event = $event;
    }

    public function get(): ?Event
    {
        return $this->event;
    }

    public function id(): ?int
    {
        return $this->event?->id;
    }

    public function require(): Event
    {
        return $this->event ?? throw new LogicException('No event is selected for this request.');
    }

    /**
     * Name of a public broadcast channel scoped to the current event.
     */
    public function channel(string $suffix): string
    {
        return $this->require()->channel($suffix);
    }

    /**
     * Run a callback with a different current event, restoring the previous one afterwards.
     *
     * @template TReturn
     *
     * @param  callable(): TReturn  $callback
     * @return TReturn
     */
    public function using(Event $event, callable $callback): mixed
    {
        $previous = $this->event;
        $this->event = $event;

        try {
            return $callback();
        } finally {
            $this->event = $previous;
        }
    }
}
