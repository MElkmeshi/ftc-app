<?php

namespace App\Http\Controllers\Mobile;

use App\Enums\RankingMethod;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Services\AllianceSelectionService;
use App\Services\CurrentEvent;
use Illuminate\Http\JsonResponse;

/**
 * The events a device can open, and the public standings of one of them.
 */
class EventController extends Controller
{
    public function index(): JsonResponse
    {
        $events = Event::query()
            ->whereNull('archived_at')
            ->withCount(['teams', 'matches'])
            ->orderByDesc('start_date')
            ->orderBy('name')
            ->get()
            ->map(fn (Event $event): array => $this->describe($event) + [
                'teams_count' => $event->teams_count,
                'matches_count' => $event->matches_count,
            ]);

        return response()->json(['events' => $events]);
    }

    public function show(CurrentEvent $currentEvent): JsonResponse
    {
        return response()->json(['event' => $this->describe($currentEvent->require())]);
    }

    public function rankings(AllianceSelectionService $selection): JsonResponse
    {
        return response()->json([
            'ranking_method' => RankingMethod::current()->value,
            'rankings' => $selection->getRankings(),
        ]);
    }

    /**
     * @return array{code: string, name: string, type: string|null, venue: string|null, timezone: string|null, start_date: string|null, end_date: string|null, field_count: int}
     */
    private function describe(Event $event): array
    {
        return [
            'code' => $event->code,
            'name' => $event->name,
            'type' => $event->type?->value,
            'venue' => $event->venue,
            'timezone' => $event->timezone,
            'start_date' => $event->start_date?->format('Y-m-d'),
            'end_date' => $event->end_date?->format('Y-m-d'),
            'field_count' => $event->field_count ?? 1,
        ];
    }
}
