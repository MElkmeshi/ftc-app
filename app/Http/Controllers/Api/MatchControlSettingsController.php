<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateMatchControlSettingsRequest;
use App\Services\MatchControlSettings;
use Illuminate\Http\JsonResponse;

class MatchControlSettingsController extends Controller
{
    public function show(MatchControlSettings $settings): JsonResponse
    {
        return response()->json($settings->all());
    }

    public function update(UpdateMatchControlSettingsRequest $request, MatchControlSettings $settings): JsonResponse
    {
        return response()->json($settings->update($request->validated()));
    }
}
