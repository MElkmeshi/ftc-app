<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCompetitionSettingsRequest;
use App\Models\Setting;
use App\Services\MatchTimingService;
use Illuminate\Http\JsonResponse;

class SettingsController extends Controller
{
    public function __construct(private readonly MatchTimingService $matchTiming) {}

    public function getCompetitionSettings(): JsonResponse
    {
        return response()->json([
            'timing' => $this->matchTiming->current(),
            'sounds' => config('competition.sounds'),
        ]);
    }

    public function updateCompetitionSettings(UpdateCompetitionSettingsRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Save each setting to database
        Setting::set('competition', 'pre_match_countdown', $validated['pre_match_countdown']);
        Setting::set('competition', 'autonomous', $validated['autonomous']);
        Setting::set('competition', 'transition', $validated['transition']);
        Setting::set('competition', 'teleop', $validated['teleop']);
        Setting::set('competition', 'endgame_warning', $validated['endgame_warning']);
        Setting::set('competition', 'controllers_warning_offset', $validated['controllers_warning_offset']);

        return response()->json([
            'message' => 'Competition settings updated successfully',
            'timing' => $validated,
        ]);
    }

    public function resetCompetitionSettings(): JsonResponse
    {
        // Delete all competition settings to fall back to config defaults
        Setting::where('group', 'competition')->delete();

        return response()->json([
            'message' => 'Competition settings reset to defaults',
        ]);
    }
}
