<?php

namespace App\Http\Controllers\Api;

use App\Events\MatchStatusChanged;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateMatchControlSettingsRequest;
use App\Models\CompetitionMatch;
use App\Services\MatchControlSettings;
use App\Services\TestMode;
use App\Support\LiveBroadcast;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

    public function setTestMode(Request $request, TestMode $testMode, MatchControlSettings $settings): JsonResponse
    {
        $validated = $request->validate(['enabled' => ['required', 'boolean']]);

        $validated['enabled'] ? $testMode->enter($request->user()->id) : $testMode->leave();

        LiveBroadcast::send(new MatchStatusChanged(CompetitionMatch::query()->inPlayOrder()->first() ?? new CompetitionMatch, 'scheduled'));

        return response()->json($settings->all());
    }
}
