<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTeamRequest;
use App\Http\Requests\UpdateTeamRequest;
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

    public function destroy(Team $team): JsonResponse
    {
        $team->delete();

        return response()->json(null, 204);
    }
}
