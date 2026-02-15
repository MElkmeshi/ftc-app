<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SettingsController extends Controller
{
    public function getCompetitionSettings(): JsonResponse
    {
        // Get timing settings from database, fallback to config
        $timing = [
            'pre_match_countdown' => (int) Setting::get('competition', 'pre_match_countdown', config('competition.timing.pre_match_countdown')),
            'autonomous' => (int) Setting::get('competition', 'autonomous', config('competition.timing.autonomous')),
            'transition' => (int) Setting::get('competition', 'transition', config('competition.timing.transition')),
            'teleop' => (int) Setting::get('competition', 'teleop', config('competition.timing.teleop')),
            'endgame_warning' => (int) Setting::get('competition', 'endgame_warning', config('competition.timing.endgame_warning')),
            'controllers_warning_offset' => (int) Setting::get('competition', 'controllers_warning_offset', config('competition.timing.controllers_warning_offset')),
        ];

        // Calculate derived values
        $timing['total_match'] = $timing['autonomous'] + $timing['transition'] + $timing['teleop'];
        $timing['total_with_countdown'] = $timing['total_match'] + $timing['pre_match_countdown'];

        return response()->json([
            'timing' => $timing,
            'sounds' => config('competition.sounds'),
        ]);
    }

    public function updateCompetitionSettings(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'pre_match_countdown' => 'required|integer|min:0|max:10',
            'autonomous' => 'required|integer|min:0|max:60',
            'transition' => 'required|integer|min:0|max:30',
            'teleop' => 'required|integer|min:0|max:300',
            'endgame_warning' => 'required|integer|min:0|max:60',
            'controllers_warning_offset' => 'required|integer|min:0|max:10',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

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
