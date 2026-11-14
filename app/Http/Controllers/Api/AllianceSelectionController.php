<?php

namespace App\Http\Controllers\Api;

use App\Events\AllianceSelectionUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\AcceptPickRequest;
use App\Http\Requests\DeclinePickRequest;
use App\Http\Requests\InviteTeamRequest;
use App\Http\Requests\StartAllianceSelectionRequest;
use App\Models\AllianceGroup;
use App\Services\AllianceSelectionService;
use App\Support\LiveBroadcast;
use Illuminate\Http\JsonResponse;

class AllianceSelectionController extends Controller
{
    public function __construct(private AllianceSelectionService $service) {}

    public function rankings(): JsonResponse
    {
        return response()->json($this->service->getRankings());
    }

    public function start(StartAllianceSelectionRequest $request): JsonResponse
    {
        try {
            $groups = $this->service->startSelection(
                numberOfAlliances: $request->validated('number_of_alliances'),
                createdBy: auth()->id() ?? 1,
                allianceSize: $request->validated('alliance_size'),
            );
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->broadcastState('started');

        return response()->json($groups);
    }

    public function groups(): JsonResponse
    {
        return response()->json($this->service->getGroups());
    }

    public function availableTeams(): JsonResponse
    {
        return response()->json($this->service->getAvailableTeams());
    }

    public function declinedTeams(): JsonResponse
    {
        return response()->json($this->service->getDeclinedTeams());
    }

    public function invite(InviteTeamRequest $request): JsonResponse
    {
        try {
            $group = $this->service->inviteTeam(
                allianceGroupId: $request->validated('alliance_group_id'),
                teamId: $request->validated('team_id'),
                updatedBy: auth()->id() ?? 1,
            );
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->broadcastState('invited');

        return response()->json($group);
    }

    public function accept(AcceptPickRequest $request): JsonResponse
    {
        try {
            $group = $this->service->acceptPick(
                allianceGroupId: $request->validated('alliance_group_id'),
                updatedBy: auth()->id() ?? 1,
            );
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->broadcastState('accepted');

        return response()->json($group);
    }

    public function decline(DeclinePickRequest $request): JsonResponse
    {
        try {
            $group = $this->service->declinePick(
                allianceGroupId: $request->validated('alliance_group_id'),
                updatedBy: auth()->id() ?? 1,
            );
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->broadcastState('declined');

        return response()->json($group);
    }

    public function status(): JsonResponse
    {
        return response()->json([
            'started' => AllianceGroup::exists(),
            'complete' => $this->service->isComplete(),
            'current_pick_seed' => $this->service->getCurrentPickingGroup()?->seed,
            'groups' => $this->service->getGroups(),
            'declined_teams' => $this->service->getDeclinedTeams(),
        ]);
    }

    public function reset(): JsonResponse
    {
        try {
            $this->service->reset();
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->broadcastState('reset');

        return response()->json(['message' => 'Alliance selection reset successfully.']);
    }

    /**
     * Push the full selection state to every connected display, mirroring the
     * "server is the source of truth" model the rest of the app uses.
     */
    private function broadcastState(string $action): void
    {
        LiveBroadcast::send(new AllianceSelectionUpdated(
            action: $action,
            groups: $this->service->getGroups(),
            declinedTeams: $this->service->getDeclinedTeams(),
            complete: $this->service->isComplete(),
            currentPickSeed: $this->service->getCurrentPickingGroup()?->seed,
        ));
    }
}
