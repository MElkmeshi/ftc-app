<?php

namespace App\Http\Controllers;

use App\Enums\RefereeRole;
use App\Events\MatchStatusChanged;
use App\Events\ScoreUpdated;
use App\Models\CompetitionMatch;
use App\Models\Group;
use App\Models\Score;
use App\Models\ScoreType;
use App\Services\CurrentEvent;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * A match's scoresheet for anyone at the venue, and its change history for
 * the head referee (FTC Live's Scoresheet and View Match History pages).
 */
class MatchSheetController extends Controller
{
    public function show(CompetitionMatch $match, CurrentEvent $currentEvent): Response
    {
        return Inertia::render('matches/sheet', [
            'match' => Inertia::live(
                fn () => $this->sheet($match->id),
                on: [MatchStatusChanged::class, ScoreUpdated::class],
                channel: $currentEvent->channel('match-control'),
                throttle: 1000,
            ),
            'scoreTypes' => ScoreType::query()->orderBy('name')->get(['id', 'name', 'points', 'group_id', 'awarded_to', 'target']),
            'groups' => Group::query()->orderBy('display_order')->get(['id', 'name', 'display_order']),
        ]);
    }

    /**
     * Where the head referee types a match's scores in by hand or corrects
     * them afterwards (FTC Live's Score Edit tab).
     */
    public function edit(CompetitionMatch $match, CurrentEvent $currentEvent): Response
    {
        return Inertia::render('matches/edit', [
            'match' => Inertia::live(
                fn () => $this->sheet($match->id),
                on: [MatchStatusChanged::class, ScoreUpdated::class],
                channel: $currentEvent->channel('match-control'),
                throttle: 500,
            ),
            'scoreTypes' => ScoreType::query()->with('group:id,name,display_order')->orderBy('name')->get(),
        ]);
    }

    public function history(CompetitionMatch $match): Response
    {
        $match->load('matchAlliances.alliance', 'matchAlliances.team');

        return Inertia::render('matches/history', [
            'match' => $match,
            'entries' => $this->historyEntries($match),
        ]);
    }

    private function sheet(int $matchId): CompetitionMatch
    {
        return CompetitionMatch::query()
            ->with(['matchAlliances.team', 'matchAlliances.alliance', 'scores:id,match_id,team_id,alliance_id,score_type_id,points'])
            ->findOrFail($matchId);
    }

    /**
     * Every change to the match, newest first, each with the alliances'
     * totals right after it.
     *
     * @return list<array{at: string, kind: string, alliance: ?string, description: string, by: ?string, points: ?int, totals: array<string, int>}>
     */
    private function historyEntries(CompetitionMatch $match): array
    {
        $colors = $match->matchAlliances->mapWithKeys(fn ($matchAlliance) => [$matchAlliance->alliance_id => $matchAlliance->alliance?->color]);
        $teamNumbers = $match->matchAlliances->mapWithKeys(fn ($matchAlliance) => [$matchAlliance->team_id => $matchAlliance->team?->number]);

        $scores = $match->scores()->withTrashed()->with(['scoreType:id,name', 'creator:id,name'])->orderBy('id')->get();

        $changes = $this->scoreChanges($scores, $colors, $teamNumbers)
            ->concat($this->submissionChanges($match, $colors))
            ->concat($this->lifecycleChanges($match))
            ->sortBy([['at', 'asc'], ['order', 'asc']])
            ->values();

        $totals = $colors->filter()->unique()->mapWithKeys(fn (string $color) => [$color => 0])->all();

        return $changes
            ->map(function (array $change) use (&$totals): array {
                if ($change['alliance'] !== null && $change['points'] !== null) {
                    $totals[$change['alliance']] = ($totals[$change['alliance']] ?? 0) + $change['points'];
                }

                return [
                    'at' => $change['at']->toIso8601String(),
                    'kind' => $change['kind'],
                    'alliance' => $change['alliance'],
                    'description' => $change['description'],
                    'by' => $change['by'],
                    'points' => $change['points'],
                    'totals' => $totals,
                ];
            })
            ->reverse()
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, Score>  $scores
     * @param  Collection<int, ?string>  $colors
     * @param  Collection<int, ?string>  $teamNumbers
     * @return Collection<int, array{at: CarbonInterface, order: int, kind: string, alliance: ?string, description: string, by: ?string, points: int}>
     */
    private function scoreChanges(Collection $scores, Collection $colors, Collection $teamNumbers): Collection
    {
        return $scores->flatMap(function (Score $score) use ($colors, $teamNumbers): array {
            $isCorrection = $score->score_type_id === null;
            $what = $isCorrection ? 'Head referee correction' : ($score->scoreType?->name ?? 'Removed score type');
            $target = $score->team_id !== null ? 'team '.($teamNumbers->get($score->team_id) ?? '?') : 'alliance';
            $alliance = $colors->get($score->alliance_id);

            $added = [
                'at' => $score->created_at,
                'order' => $score->id * 2,
                'kind' => $isCorrection ? 'correction' : 'scored',
                'alliance' => $alliance,
                'description' => "{$what} · {$target}",
                'by' => $score->creator?->name,
                'points' => $score->points,
            ];

            if ($score->deleted_at === null) {
                return [$added];
            }

            return [$added, [
                'at' => $score->deleted_at,
                'order' => $score->id * 2 + 1,
                'kind' => 'removed',
                'alliance' => $alliance,
                'description' => "Removed {$what} · {$target}",
                'by' => null,
                'points' => -$score->points,
            ]];
        });
    }

    /**
     * @param  Collection<int, ?string>  $colors
     * @return Collection<int, array{at: CarbonInterface, order: int, kind: string, alliance: ?string, description: string, by: ?string, points: null}>
     */
    private function submissionChanges(CompetitionMatch $match, Collection $colors): Collection
    {
        return collect($match->submissions ?? [])->map(fn (array $submission): array => [
            'at' => Carbon::parse($submission['at']),
            'order' => PHP_INT_MAX,
            'kind' => 'submitted',
            'alliance' => $colors->get($submission['alliance_id']),
            'description' => ($submission['role'] ?? null) === RefereeRole::PENALTY->value ? 'Submitted penalties' : 'Submitted scores',
            'by' => $submission['by'] ?? null,
            'points' => null,
        ]);
    }

    /**
     * @return Collection<int, array{at: CarbonInterface, order: int, kind: string, alliance: null, description: string, by: null, points: null}>
     */
    private function lifecycleChanges(CompetitionMatch $match): Collection
    {
        return collect([
            'started' => [$match->started_at, 'Match started'],
            'ended' => [$match->ended_at, 'Match ended'],
            'cancelled' => [$match->cancelled_at, 'Match cancelled'],
        ])
            ->filter(fn (array $moment) => $moment[0] !== null)
            ->map(fn (array $moment, string $kind): array => [
                'at' => Carbon::parse($moment[0]),
                'order' => 0,
                'kind' => $kind,
                'alliance' => null,
                'description' => $moment[1],
                'by' => null,
                'points' => null,
            ])
            ->values();
    }
}
