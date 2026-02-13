<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EliminationSeries;
use App\Services\EliminationScheduler;
use Illuminate\Http\JsonResponse;

class EliminationController extends Controller
{
    public function __construct(private EliminationScheduler $scheduler) {}

    public function generate(): JsonResponse
    {
        try {
            $this->scheduler->generate(createdBy: auth()->id() ?? 1);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['message' => 'Elimination bracket generated successfully.']);
    }

    public function bracket(): JsonResponse
    {
        return response()->json($this->scheduler->getBracket());
    }

    public function checkWinner(EliminationSeries $series): JsonResponse
    {
        $winner = $this->scheduler->determineSeriesWinner($series);

        if ($winner) {
            // Try to advance bracket (for semifinal -> final)
            $this->scheduler->advanceBracket($series, auth()->id() ?? 1);

            return response()->json([
                'winner' => $winner->load(['captainTeam', 'pickedTeam']),
                'message' => 'Series winner determined.',
            ]);
        }

        $result = $this->scheduler->getSeriesResult($series);

        return response()->json([
            'winner' => null,
            'result' => $result,
            'message' => $result['group_1_wins'] === $result['group_2_wins'] && $result['completed_matches'] >= 2
                ? 'Series is tied. Tiebreaker needed.'
                : 'Series still in progress.',
        ]);
    }

    public function tiebreaker(EliminationSeries $series): JsonResponse
    {
        try {
            $match = $this->scheduler->generateTiebreaker($series, auth()->id() ?? 1);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $match->load(['matchAlliances.team', 'matchAlliances.alliance']);

        return response()->json($match);
    }

    public function reset(): JsonResponse
    {
        $this->scheduler->reset();

        return response()->json(['message' => 'Elimination data reset successfully.']);
    }
}
