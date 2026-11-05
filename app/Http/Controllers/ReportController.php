<?php

namespace App\Http\Controllers;

use App\Enums\MatchStatus;
use App\Models\CompetitionMatch;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Event-day reports for the scorekeeper and head referee (FTC Live's
 * Reports page).
 */
class ReportController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('reports/index');
    }

    /**
     * How long each match took from one start to the next, and how far it ran
     * from the schedule, so the scorekeeper can tell whether the event will
     * finish on time.
     */
    public function cycle(): Response
    {
        $matches = CompetitionMatch::query()
            ->where('status', '!=', MatchStatus::CANCELLED)
            ->orderBy('number')
            ->get(['id', 'number', 'type', 'round', 'field', 'start_time', 'started_at', 'ended_at', 'status']);

        $rows = $this->cycleRows($matches);
        $cycles = $rows->pluck('cycle_seconds')->filter(fn (?int $seconds) => $seconds !== null);
        $plannedCycles = $this->gaps($matches->pluck('start_time')->filter()->sort()->values());

        return Inertia::render('reports/cycle', [
            'rows' => $rows->all(),
            'summary' => [
                'played' => $matches->whereNotNull('started_at')->count(),
                'remaining' => $matches->whereNull('started_at')->count(),
                'average_cycle_seconds' => $cycles->isEmpty() ? null : (int) round($cycles->avg()),
                'median_cycle_seconds' => $cycles->isEmpty() ? null : (int) $cycles->median(),
                'planned_cycle_seconds' => $plannedCycles->isEmpty() ? null : (int) $plannedCycles->median(),
                'drift_seconds' => $rows->whereNotNull('drift_seconds')->last()['drift_seconds'] ?? null,
            ],
        ]);
    }

    /**
     * @param  Collection<int, CompetitionMatch>  $matches
     * @return Collection<int, array{id: int, number: int, type: string, round: ?string, field: ?int, scheduled: ?string, started: ?string, ended: ?string, cycle_seconds: ?int, drift_seconds: ?int}>
     */
    private function cycleRows(Collection $matches): Collection
    {
        $previousStart = null;

        return $matches
            ->sortBy(fn (CompetitionMatch $match) => [$match->started_at === null ? 1 : 0, $match->started_at?->getTimestamp() ?? $match->number])
            ->map(function (CompetitionMatch $match) use (&$previousStart): array {
                $cycle = $match->started_at && $previousStart ? (int) $previousStart->diffInSeconds($match->started_at) : null;
                $previousStart = $match->started_at ?? $previousStart;

                return [
                    'id' => $match->id,
                    'number' => $match->number,
                    'type' => $match->type->value,
                    'round' => $match->round,
                    'field' => $match->field,
                    'scheduled' => $match->start_time?->toIso8601String(),
                    'started' => $match->started_at?->toIso8601String(),
                    'ended' => $match->ended_at?->toIso8601String(),
                    'cycle_seconds' => $cycle,
                    'drift_seconds' => $match->started_at && $match->start_time ? (int) $match->start_time->diffInSeconds($match->started_at) : null,
                ];
            })
            ->values();
    }

    /**
     * @param  Collection<int, CarbonInterface>  $times
     * @return Collection<int, int>
     */
    private function gaps(Collection $times): Collection
    {
        return $times->sliding(2)->map(fn (Collection $pair) => (int) $pair->first()->diffInSeconds($pair->last()))->filter()->values();
    }
}
