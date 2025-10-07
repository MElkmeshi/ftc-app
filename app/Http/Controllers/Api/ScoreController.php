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

        // Load the match with relationships once
        $match = CompetitionMatch::with(['matchAlliances.team', 'matchAlliances.alliance'])
            ->findOrFail($validated['match_id']);

        $scoreType = ScoreType::findOrFail($validated['score_type_id']);

        // Create the score record
        Score::create([
            'match_id' => $validated['match_id'],
            'team_id' => $validated['team_id'],
            'score_type_id' => $validated['score_type_id'],
            'created_by' => auth()->id() ?? 1,
        ]);

        // Update the match alliance cumulative score directly in memory
        $matchAlliance = $match->matchAlliances->firstWhere('team_id', $validated['team_id']);
        if ($matchAlliance) {
            $matchAlliance->score += $scoreType->points;
            $matchAlliance->save();

            // Update the in-memory score to avoid refetching
            $matchAlliance->setAttribute('score', $matchAlliance->score);
        }

        // Broadcast the update asynchronously
        broadcast(new ScoreUpdated($match))->toOthers();

        return response()->json([
            'match' => $match,
        ], 201);
    }
}
