<?php

namespace App\Http\Controllers\Mobile;

use App\Enums\InspectionStatus;
use App\Events\InspectionUpdated;
use App\Http\Controllers\Controller;
use App\Http\Controllers\InspectionController as WebInspectionController;
use App\Http\Requests\SaveInspectionRequest;
use App\Models\Inspection;
use App\Models\Team;
use App\Services\CurrentEvent;
use App\Services\InspectionChecklist;
use App\Support\LiveBroadcast;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Robot inspection for the volunteer app: the same checklist, statuses and
 * rules as the web inspection pages, answered in JSON.
 */
class InspectionController extends Controller
{
    public function __construct(private CurrentEvent $currentEvent) {}

    public function index(WebInspectionController $inspection, InspectionChecklist $checklist): JsonResponse
    {
        return response()->json([
            'teams' => $inspection->teamStatuses(),
            'checklist' => $checklist->items(),
            'statuses' => array_map(
                fn (InspectionStatus $status): array => ['value' => $status->value, 'label' => $status->label()],
                InspectionStatus::cases(),
            ),
        ]);
    }

    public function show(Team $team, InspectionChecklist $checklist): JsonResponse
    {
        return response()->json($this->describe($team, $checklist));
    }

    public function update(SaveInspectionRequest $request, Team $team, InspectionChecklist $checklist): JsonResponse
    {
        Inspection::query()->updateOrCreate(['team_id' => $team->id], [
            'status' => $request->validated('status'),
            'checked' => $request->validated('checked'),
            'notes' => $request->validated('notes'),
            'updated_by' => $request->user()->id,
        ]);

        LiveBroadcast::send(new InspectionUpdated($this->currentEvent->require()->code, $team->id));

        return response()->json($this->describe($team, $checklist));
    }

    /**
     * The lead inspector sets a team's status directly, like FTC Live's
     * inspection override.
     */
    public function override(Request $request, Team $team, InspectionChecklist $checklist): JsonResponse
    {
        $status = $request->validate(['status' => ['required', Rule::enum(InspectionStatus::class)]])['status'];

        Inspection::query()->updateOrCreate(['team_id' => $team->id], [
            'status' => $status,
            'updated_by' => $request->user()->id,
        ]);

        LiveBroadcast::send(new InspectionUpdated($this->currentEvent->require()->code, $team->id));

        return response()->json($this->describe($team, $checklist));
    }

    /**
     * @return array{team: array<string, mixed>, checklist: list<string>, inspection: array{status: string, checked: list<string>, notes: string|null, updated_by: string|null, updated_at: string|null}}
     */
    private function describe(Team $team, InspectionChecklist $checklist): array
    {
        $inspection = $team->inspection()->with('updater:id,name')->first();

        return [
            'team' => $team->only(['id', 'number', 'name', 'organization', 'city']),
            'checklist' => $checklist->items(),
            'inspection' => [
                'status' => ($inspection->status ?? InspectionStatus::NotStarted)->value,
                'checked' => $inspection->checked ?? [],
                'notes' => $inspection?->notes,
                'updated_by' => $inspection?->updater?->name,
                'updated_at' => $inspection?->updated_at?->toIso8601String(),
            ],
        ];
    }
}
