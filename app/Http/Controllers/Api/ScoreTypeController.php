<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreScoreTypeRequest;
use App\Http\Requests\UpdateScoreTypeRequest;
use App\Models\ScoreType;
use Illuminate\Http\JsonResponse;

class ScoreTypeController extends Controller
{
    public function index(): JsonResponse
    {
        $scoreTypes = ScoreType::with('group')
            ->orderBy('group_id')
            ->orderBy('name')
            ->get();

        return response()->json($scoreTypes);
    }

    public function store(StoreScoreTypeRequest $request): JsonResponse
    {
        $scoreType = ScoreType::create([
            ...$request->validated(),
            'created_by' => auth()->id(),
        ]);

        $scoreType->load('group');

        return response()->json($scoreType, 201);
    }

    public function update(UpdateScoreTypeRequest $request, ScoreType $scoreType): JsonResponse
    {
        $scoreType->update($request->validated());
        $scoreType->load('group');

        return response()->json($scoreType);
    }

    public function destroy(ScoreType $scoreType): JsonResponse
    {
        $scoreType->delete();

        return response()->json(null, 204);
    }
}
