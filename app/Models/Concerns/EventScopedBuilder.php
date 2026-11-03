<?php

namespace App\Models\Concerns;

use App\Services\CurrentEvent;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Eloquent's `forceDelete()` deletes through the raw query and so skips
 * global scopes, which would let `Team::withTrashed()->forceDelete()` wipe
 * every event. This builder applies the event scope to it as well.
 *
 * @template TModel of Model
 *
 * @extends Builder<TModel>
 */
class EventScopedBuilder extends Builder
{
    public function forceDelete()
    {
        $eventId = app(CurrentEvent::class)->id();

        if ($eventId !== null && ! in_array('event', $this->removedScopes(), true)) {
            $this->query->where($this->model->qualifyColumn('event_id'), $eventId);
        }

        return parent::forceDelete();
    }
}
