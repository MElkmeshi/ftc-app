<?php

namespace App\Http\Controllers;

use App\Enums\EventType;
use App\Enums\MatchStatus;
use App\Http\Requests\StoreEventRequest;
use App\Http\Requests\UpdateEventRequest;
use App\Models\CompetitionMatch;
use App\Models\Event;
use App\Models\Game;
use App\Models\Team;
use App\Services\CurrentEvent;
use App\Services\FieldAssignment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class EventController extends Controller
{
    /**
     * The server home page: every event hosted here, like FTC Live's event list.
     */
    public function home(): Response|RedirectResponse
    {
        $codes = Event::query()->limit(2)->pluck('code');

        return $codes->count() === 1 ? to_route('events.show', ['event' => $codes->first()]) : $this->index();
    }

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
            'games' => Game::query()->orderBy('name')->get(['id', 'name']),
            'defaultTimezone' => config('app.timezone'),
        ]);
    }

    /**
     * Without a game picked, the event gets a new blank game of its own.
     */
    public function store(StoreEventRequest $request): RedirectResponse
    {
        $event = DB::transaction(function () use ($request): Event {
            $gameId = $request->validated('game_id') ?? Game::query()->create([
                'name' => $request->validated('name').' game',
                'created_by' => $request->user()->id,
            ])->id;

            return Event::query()->create([
                ...$request->validated(),
                'game_id' => $gameId,
                'created_by' => $request->user()->id,
            ]);
        });

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

    public function update(UpdateEventRequest $request, CurrentEvent $currentEvent, FieldAssignment $fields): RedirectResponse
    {
        $event = $currentEvent->require();
        $event->update($request->validated());

        if ($event->wasChanged('field_count')) {
            $fields->reassignUpcoming();
        }

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
