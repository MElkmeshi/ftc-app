<?php

namespace App\Http\Controllers;

use App\Enums\EventType;
use App\Enums\MatchStatus;
use App\Http\Requests\StoreEventRequest;
use App\Http\Requests\UpdateEventRequest;
use App\Models\CompetitionMatch;
use App\Models\Event;
use App\Models\Team;
use App\Services\CurrentEvent;
use App\Services\EventGameCopier;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class EventController extends Controller
{
    /**
     * The server home page: every event hosted here, like FTC Live's event list.
     */
    public function index(): Response
    {
        $events = Event::query()
            ->withCount(['teams', 'matches'])
            ->orderByDesc('start_date')
            ->orderBy('name')
            ->get();

        return Inertia::render('events/index', [
            'events' => $events,
            'eventTypes' => $this->eventTypeOptions(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('events/create', [
            'eventTypes' => $this->eventTypeOptions(),
            'existingEvents' => Event::query()->orderByDesc('start_date')->get(['code', 'name']),
            'defaultTimezone' => config('app.timezone'),
        ]);
    }

    public function store(StoreEventRequest $request, EventGameCopier $copier): RedirectResponse
    {
        $event = Event::query()->create([
            ...$request->safe()->except('copy_game_from'),
            'created_by' => $request->user()->id,
        ]);

        if ($request->filled('copy_game_from')) {
            $copier->copy(Event::query()->where('code', $request->validated('copy_game_from'))->firstOrFail(), $event);
        }

        return to_route('dashboard', ['event' => $event->code]);
    }

    /**
     * Public landing page for one event: links to every display, schedule and report.
     */
    public function show(): Response
    {
        return Inertia::render('events/show', [
            'summary' => [
                'teams' => Team::query()->count(),
                'matches' => CompetitionMatch::query()->count(),
                'completed_matches' => CompetitionMatch::query()->where('status', MatchStatus::COMPLETED)->count(),
            ],
            'eventTypes' => $this->eventTypeOptions(),
        ]);
    }

    public function update(UpdateEventRequest $request, CurrentEvent $currentEvent): RedirectResponse
    {
        $currentEvent->require()->update($request->validated());

        return back();
    }

    public function archive(CurrentEvent $currentEvent): RedirectResponse
    {
        $event = $currentEvent->require();
        $event->update(['archived_at' => $event->isArchived() ? null : now()]);

        return back();
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    private function eventTypeOptions(): array
    {
        return array_map(
            fn (EventType $type): array => ['value' => $type->value, 'label' => $type->label()],
            EventType::cases(),
        );
    }
}
