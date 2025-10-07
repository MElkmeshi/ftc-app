<?php

namespace App\Http\Controllers\Api;

use App\Events\ScoreUpdated;
use App\Http\Controllers\Controller;
use App\Models\CompetitionMatch;
use App\Models\Score;
use App\Models\ScoreType;
use Illuminate\Http\Request;

class ScoreController extends Controller
{
    public function index()
    {
        $scoreTypes = ScoreType::all();

        return response()->json($scoreTypes);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'match_id' => 'required|exists:matches,id',
            'team_id' => 'required|exists:teams,id',
            'score_type_id' => 'required|exists:score_types,id',
        ]);

        $scoreType = ScoreType::findOrFail($validated['score_type_id']);
        $match = CompetitionMatch::with(['matchAlliances.team', 'matchAlliances.alliance', 'matchAlliances.scores.scoreType'])
            ->findOrFail($validated['match_id']);

        // Create the score record
        $score = Score::create([
            'match_id' => $validated['match_id'],
            'team_id' => $validated['team_id'],
            'score_type_id' => $validated['score_type_id'],
            'created_by' => auth()->id() ?? 1,
        ]);

        // Update the match alliance cumulative score
        $matchAlliance = $match->matchAlliances->firstWhere('team_id', $validated['team_id']);
        if ($matchAlliance) {
            $matchAlliance->score += $scoreType->points;
            $matchAlliance->save();
        }

        // Refresh the match to get the latest data
        $updatedMatch = $match->fresh(['matchAlliances.team', 'matchAlliances.alliance', 'matchAlliances.scores.scoreType']);

        // Broadcast the update
        broadcast(new ScoreUpdated($updatedMatch))->toOthers();

        return response()->json([
            'score' => $score,
            'match' => $updatedMatch,
        ], 201);
    }
}
