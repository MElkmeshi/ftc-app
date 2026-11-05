<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTeamRequest;
use App\Http\Requests\UpdateTeamRequest;
use App\Models\MatchAlliance;
use App\Models\Team;
use Illuminate\Http\JsonResponse;

class TeamController extends Controller
{
    public function index(): JsonResponse
    {
        $teams = Team::query()->orderBy('number')->get();

        return response()->json($teams);
    }

    public function store(StoreTeamRequest $request): JsonResponse
    {
        $team = Team::create([
            ...$request->validated(),
            'created_by' => auth()->id(),
            'updated_by' => auth()->id(),
        ]);

        return response()->json($team, 201);
    }

    public function update(UpdateTeamRequest $request, Team $team): JsonResponse
    {
        $team->update([
            ...$request->validated(),
            'updated_by' => auth()->id(),
        ]);

        return response()->json($team);
    }

    /**
     * A team already in the schedule cannot be deleted: every screen showing
     * its matches would lose it. Regenerate the schedule without it first.
     */
    public function destroy(Team $team): JsonResponse
    {
        if (MatchAlliance::query()->where('team_id', $team->id)->exists()) {
            return response()->json([
                'message' => "Team {$team->number} is in the match schedule. Regenerate the schedule without it before deleting it.",
            ], 422);
        }

        $team->delete();

        return response()->json(null, 204);
    }
}
