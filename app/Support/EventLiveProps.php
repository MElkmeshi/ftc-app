<?php

namespace App\Support;

use App\Events\AllianceSelectionUpdated;
use App\Events\AudienceDisplayChanged;
use App\Events\EliminationBracketUpdated;
use App\Events\MatchStatusChanged;
use App\Events\ScoreUpdated;
use App\Models\CompetitionMatch;
use App\Services\AllianceSelectionService;
use App\Services\AudienceDisplay;
use App\Services\CurrentEvent;
use App\Services\EliminationScheduler;
use Inertia\Inertia;
use Inertia\LiveProp;

/**
 * Live props shared by several pages (a standalone rankings screen and the
 * audience display's rankings mode, for example), so they reload on the same
 * broadcasts everywhere.
 */
class EventLiveProps
{
    public function __construct(private CurrentEvent $currentEvent) {}

    public function rankings(): LiveProp
    {
        return Inertia::live(
            fn () => app(AllianceSelectionService::class)->getRankings(),
            on: [MatchStatusChanged::class, ScoreUpdated::class],
            channel: $this->currentEvent->channel('match-control'),
            throttle: 3000,
        );
    }

    public function bracket(): LiveProp
    {
        return Inertia::live(fn () => app(EliminationScheduler::class)->getBracket(), on: EliminationBracketUpdated::class, channel: $this->currentEvent->channel('elimination'))
            ->live(on: [MatchStatusChanged::class, ScoreUpdated::class], channel: $this->currentEvent->channel('match-control'))
            ->live(on: AllianceSelectionUpdated::class, channel: $this->currentEvent->channel('alliance-selection'));
    }

    public function audienceDisplay(): LiveProp
    {
        return Inertia::live(fn () => app(AudienceDisplay::class)->state(), on: AudienceDisplayChanged::class, channel: $this->currentEvent->channel('display'));
    }

    /**
     * Every match with its teams and running scores, for match control.
     */
    public function matches(): LiveProp
    {
        return Inertia::live(
            fn () => CompetitionMatch::query()
                ->withScoreSummary()
                ->with('eliminationSeries:id,round')
                ->orderBy('number')
                ->get(),
            on: [MatchStatusChanged::class, ScoreUpdated::class],
            channel: $this->currentEvent->channel('match-control'),
            throttle: 1000,
        );
    }
}
