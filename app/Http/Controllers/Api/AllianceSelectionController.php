<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AcceptPickRequest;
use App\Http\Requests\DeclinePickRequest;
use App\Http\Requests\InviteTeamRequest;
use App\Http\Requests\StartAllianceSelectionRequest;
use App\Services\AllianceSelectionService;
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
            );
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

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

        return response()->json($group);
    }

    public function status(): JsonResponse
    {
        return response()->json([
            'started' => \App\Models\AllianceGroup::exists(),
            'complete' => $this->service->isComplete(),
            'groups' => $this->service->getGroups(),
        ]);
    }

    public function reset(): JsonResponse
    {
        $this->service->reset();

        return response()->json(['message' => 'Alliance selection reset successfully.']);
    }
}
