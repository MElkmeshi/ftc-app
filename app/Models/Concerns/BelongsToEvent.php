<?php

namespace App\Models\Concerns;

use App\Models\Event;
use App\Services\CurrentEvent;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/**
 * Scopes a model to the current event: queries only see the current event's
 * rows, and new rows are stamped with the current event automatically.
 *
 * With no current event (console commands, queued jobs) queries are not
 * filtered, so cross-event maintenance code keeps working.
 */
trait BelongsToEvent
{
    public static function bootBelongsToEvent(): void
    {
        static::addGlobalScope('event', function (Builder $query): void {
            $eventId = app(CurrentEvent::class)->id();

            if ($eventId !== null) {
                $query->where($query->getModel()->qualifyColumn('event_id'), $eventId);
            }
        });
    }

    /**
     * @param  \Illuminate\Database\Query\Builder  $query
     * @return EventScopedBuilder<static>
     */
    public function newEloquentBuilder($query): EventScopedBuilder
    {
        return new EventScopedBuilder($query);
    }

    /**
     * Stamps the current event on insert. This is done here rather than in a
     * `creating` listener so it still happens when model events are faked.
     */
    protected function performInsert(Builder $query): bool
    {
        if ($this->getAttribute('event_id') === null) {
            $this->setAttribute('event_id', app(CurrentEvent::class)->id()
                ?? throw new LogicException('Cannot create '.class_basename($this).' without a current event.'));
        }

        return parent::performInsert($query);
    }

    /**
     * @return BelongsTo<Event, $this>
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}
