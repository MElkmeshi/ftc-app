<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMatchNoteRequest;
use App\Models\MatchNote;
use Illuminate\Http\JsonResponse;

/**
 * The head referee's notes on matches (FTC Live's Head Referee Notes tab).
 */
class MatchNoteController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(MatchNote::query()->with('author:id,name')->orderBy('id')->get());
    }

    public function store(StoreMatchNoteRequest $request): JsonResponse
    {
        $note = MatchNote::query()->create([...$request->validated(), 'created_by' => $request->user()->id]);

        return response()->json($note->load('author:id,name'), 201);
    }

    public function destroy(MatchNote $note): JsonResponse
    {
        $note->delete();

        return response()->json(null, 204);
    }
}
