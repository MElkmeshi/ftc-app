<?php

namespace App\Http\Controllers;

use App\Enums\MatchStatus;
use App\Models\CompetitionMatch;
use App\Models\Group;
use App\Models\MatchAlliance;
use App\Models\ScoreType;
use App\Models\Team;
use App\Services\AllianceSelectionService;
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
     * Every match with each team's name, where it is from and how it is doing,
     * for whoever announces the matches.
     */
    public function announcer(): Response
    {
        return Inertia::render('reports/announcer', [
            'matches' => $this->schedule(),
            'standings' => $this->standings(),
        ]);
    }

    /**
     * One page per team with its number big enough to read across the pits,
     * in ranking order so they can be handed out at alliance selection.
     */
    public function placards(): Response
    {
        $standings = $this->standings();

        return Inertia::render('reports/placards', [
            'teams' => $this->teams()
                ->sortBy(fn (Team $team) => [$standings[$team->id]['rank'] ?? PHP_INT_MAX, (int) $team->number])
                ->values(),
            'standings' => $standings,
        ]);
    }

    /**
     * Every card given so far, by team (FTC Live's head referee tracking
     * report), so the head referee knows who already holds a yellow card.
     */
    public function cards(): Response
    {
        $cards = MatchAlliance::query()
            ->whereNotNull('card')
            ->whereHas('match', fn ($query) => $query->where('status', '!=', MatchStatus::CANCELLED))
            ->with(['match:id,number,type,round', 'team:id,number,name'])
            ->get();

        return Inertia::render('reports/cards', [
            'teams' => $cards
                ->filter(fn (MatchAlliance $matchAlliance): bool => $matchAlliance->team !== null)
                ->groupBy('team_id')
                ->map(fn (Collection $teamCards): array => [
                    'team' => $teamCards->first()->team->only(['id', 'number', 'name']),
                    'cards' => $teamCards
                        ->sortBy(fn (MatchAlliance $matchAlliance) => $matchAlliance->match->number)
                        ->map(fn (MatchAlliance $matchAlliance): array => [
                            'card' => $matchAlliance->card->value,
                            'match' => $matchAlliance->match->only(['id', 'number', 'type', 'round']),
                        ])
                        ->values(),
                ])
                ->sortBy(fn (array $row): int => (int) $row['team']['number'])
                ->values(),
        ]);
    }

    /**
     * Each team's own matches on its own page, to hand out at check-in.
     */
    public function teamSchedules(): Response
    {
        return Inertia::render('reports/team-schedules', [
            'teams' => $this->teams(),
            'matches' => $this->schedule(),
        ]);
    }

    /**
     * Blank paper scoresheets, one per alliance per match, for when a tablet
     * fails or a referee prefers paper.
     */
    public function scoresheets(): Response
    {
        return Inertia::render('reports/scoresheets', [
            'matches' => $this->schedule()->where('status', '!=', MatchStatus::CANCELLED)->values(),
            'groups' => Group::query()->orderBy('display_order')->get(['id', 'name', 'display_order']),
            'scoreTypes' => ScoreType::query()->orderBy('id')->get(['id', 'name', 'points', 'group_id', 'target', 'kind', 'choice_set', 'referee', 'awarded_to']),
        ]);
    }

    /**
     * A sheet with a row per team and room to write, for inspectors, judges
     * or the field technical advisor.
     */
    public function notes(): Response
    {
        return Inertia::render('reports/notes', ['teams' => $this->teams()]);
    }

    /**
     * @return Collection<int, Team>
     */
    private function teams(): Collection
    {
        return Team::query()->get(['id', 'number', 'name', 'organization', 'city', 'rookie_year'])->sortBy(fn (Team $team) => (int) $team->number)->values();
    }

    /**
     * @return Collection<int, CompetitionMatch>
     */
    private function schedule(): Collection
    {
        return CompetitionMatch::query()
            ->with(['matchAlliances.alliance', 'matchAlliances.team:id,number,name,organization,city,rookie_year'])
            ->orderBy('number')
            ->get(['id', 'number', 'type', 'round', 'field', 'start_time', 'status']);
    }

    /**
     * Each ranked team's rank and record, keyed by team id.
     *
     * @return array<int, array{rank: int, wins: int, losses: int, ties: int, played: int}>
     */
    private function standings(): array
    {
        return app(AllianceSelectionService::class)->getRankings()
            ->values()
            ->mapWithKeys(fn (array $ranking, int $index): array => [$ranking['team_id'] => [
                'rank' => $ranking['rank'] ?? $index + 1,
                'wins' => $ranking['wins'],
                'losses' => $ranking['losses'],
                'ties' => $ranking['ties'],
                'played' => $ranking['played'],
            ]])
            ->all();
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
