<?php

namespace App\Http\Controllers;

use App\Enums\InspectionStatus;
use App\Events\InspectionUpdated;
use App\Http\Requests\SaveInspectionRequest;
use App\Models\Inspection;
use App\Models\Team;
use App\Services\CurrentEvent;
use App\Services\InspectionChecklist;
use App\Support\LiveBroadcast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\LiveProp;
use Inertia\Response;

/**
 * Robot inspection, like FTC Live's: inspectors work through a checklist
 * for each team on a phone, and a status board shows every team's result
 * so teams know when to come to the inspection table.
 */
class InspectionController extends Controller
{
    public function __construct(private CurrentEvent $currentEvent) {}

    public function index(InspectionChecklist $checklist): Response
    {
        return Inertia::render('inspection/index', [
            'teams' => $this->statuses(),
            'checklist' => $checklist->items(),
        ]);
    }

    public function show(Team $team, InspectionChecklist $checklist): Response
    {
        $inspection = $team->inspection()->with('updater:id,name')->first();

        return Inertia::render('inspection/team', [
            'team' => $team->only(['id', 'number', 'name', 'organization', 'city']),
            'checklist' => $checklist->items(),
            'inspection' => [
                'status' => ($inspection->status ?? InspectionStatus::NotStarted)->value,
                'checked' => $inspection->checked ?? [],
                'notes' => $inspection?->notes,
                'updated_by' => $inspection?->updater?->name,
                'updated_at' => $inspection?->updated_at?->toIso8601String(),
            ],
        ]);
    }

    public function update(SaveInspectionRequest $request, Team $team): RedirectResponse
    {
        Inspection::query()->updateOrCreate(['team_id' => $team->id], [
            'status' => $request->validated('status'),
            'checked' => $request->validated('checked'),
            'notes' => $request->validated('notes'),
            'updated_by' => $request->user()->id,
        ]);

        LiveBroadcast::send(new InspectionUpdated($this->currentEvent->require()->code, $team->id));

        return to_route('inspection.index', ['event' => $this->currentEvent->require()->code]);
    }

    public function updateChecklist(Request $request, InspectionChecklist $checklist): RedirectResponse
    {
        $items = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:60'],
            'items.*' => ['required', 'string', 'max:200', 'distinct'],
        ])['items'];

        $checklist->save(array_map(trim(...), $items));

        return back();
    }

    /**
     * The lead inspector's page for setting any team's status directly,
     * like FTC Live's inspection override.
     */
    public function override(): Response
    {
        return Inertia::render('inspection/override', ['teams' => $this->statuses()]);
    }

    public function overrideStatus(Request $request, Team $team): RedirectResponse
    {
        $status = $request->validate(['status' => ['required', Rule::enum(InspectionStatus::class)]])['status'];

        Inspection::query()->updateOrCreate(['team_id' => $team->id], [
            'status' => $status,
            'updated_by' => $request->user()->id,
        ]);

        LiveBroadcast::send(new InspectionUpdated($this->currentEvent->require()->code, $team->id));

        return back();
    }

    public function notes(): Response
    {
        return Inertia::render('inspection/notes', [
            'teams' => Team::query()
                ->with('inspection:id,team_id,status,notes')
                ->get(['id', 'number', 'name'])
                ->sortBy(fn (Team $team): int => (int) $team->number)
                ->values()
                ->map(fn (Team $team): array => [
                    'id' => $team->id,
                    'number' => $team->number,
                    'name' => $team->name,
                    'status' => ($team->inspection->status ?? InspectionStatus::NotStarted)->value,
                    'notes' => $team->inspection?->notes,
                ]),
        ]);
    }

    /**
     * The public status board for a projector or the pit.
     */
    public function board(): Response
    {
        return Inertia::render('inspection/status', ['teams' => $this->statuses()]);
    }

    private function statuses(): LiveProp
    {
        return Inertia::live(
            fn () => Team::query()
                ->with('inspection:id,team_id,status')
                ->get(['id', 'number', 'name'])
                ->sortBy(fn (Team $team): int => (int) $team->number)
                ->values()
                ->map(fn (Team $team): array => [
                    'id' => $team->id,
                    'number' => $team->number,
                    'name' => $team->name,
                    'status' => ($team->inspection->status ?? InspectionStatus::NotStarted)->value,
                ]),
            on: InspectionUpdated::class,
            channel: $this->currentEvent->channel('inspection'),
        );
    }
}
