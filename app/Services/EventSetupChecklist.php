<?php

namespace App\Services;

use App\Enums\EliminationRound;
use App\Enums\MatchStatus;
use App\Enums\UserRole;
use App\Models\AllianceGroup;
use App\Models\CompetitionMatch;
use App\Models\EliminationSeries;
use App\Models\ScoreType;
use App\Models\Sponsor;
use App\Models\Team;
use App\Models\User;

/**
 * The numbered "what's left to do" list on the event dashboard, modelled on
 * FTC Live's event setup page. Each step reports its own status so an
 * organiser can see at a glance how far along the event is.
 */
class EventSetupChecklist
{
    public const DONE = 'done';

    public const IN_PROGRESS = 'in_progress';

    public const TODO = 'todo';

    public const OPTIONAL = 'optional';

    public function __construct(private AllianceSelectionService $allianceSelection, private CurrentGame $currentGame) {}

    /**
     * @return list<array{key: string, title: string, description: string, status: string, detail: string, href: string}>
     */
    public function steps(): array
    {
        $scoreTypeCount = ScoreType::query()->count();
        $teamCount = Team::query()->count();
        $qualificationMatches = CompetitionMatch::query()->qualification()->count();
        $completedQualifications = CompetitionMatch::query()->qualification()->where('status', MatchStatus::COMPLETED)->count();
        $allianceCount = AllianceGroup::query()->count();
        $finalWinner = EliminationSeries::query()->where('round', EliminationRound::FINAL->value)->whereNotNull('winner_alliance_group_id')->exists();
        $playoffSeries = EliminationSeries::query()->count();
        $timingCustomised = ($this->currentGame->get()?->timing ?? []) !== [];
        $sponsorCount = Sponsor::query()->count();
        $officials = User::query()->whereIn('role', [UserRole::Admin, UserRole::HeadReferee, UserRole::Referee])->count();

        return [
            $this->step('details', 'Event details', 'Name, dates, venue and number of fields.', self::DONE, 'Edit any time', '/dashboard#details'),
            $this->step(
                'score-types',
                'Game & score types',
                'Define what robots score points for. Score types can target a team or a whole alliance.',
                $scoreTypeCount > 0 ? self::DONE : self::TODO,
                $scoreTypeCount > 0 ? "{$scoreTypeCount} score types" : 'No score types yet',
                '/admin/score-types',
            ),
            $this->step(
                'timing',
                'Match timing',
                'Autonomous, teleop and endgame lengths and warning sounds.',
                $timingCustomised ? self::DONE : self::OPTIONAL,
                $timingCustomised ? 'Custom timing saved' : 'Using default timing',
                '/admin/competition-settings',
            ),
            $this->step(
                'accounts',
                'Referee & scorekeeper accounts',
                'Give every official a login with the right role.',
                $officials > 1 ? self::DONE : self::TODO,
                "{$officials} official account".($officials === 1 ? '' : 's'),
                '/accounts',
            ),
            $this->step(
                'teams',
                'Teams',
                'Add every competing team. Numbers only need to be unique within this event.',
                $teamCount >= 2 ? self::DONE : ($teamCount > 0 ? self::IN_PROGRESS : self::TODO),
                "{$teamCount} team".($teamCount === 1 ? '' : 's'),
                '/admin/teams',
            ),
            $this->step(
                'sponsors',
                'Sponsors',
                'Sponsor names and logos for the audience display.',
                $sponsorCount > 0 ? self::DONE : self::OPTIONAL,
                "{$sponsorCount} sponsor".($sponsorCount === 1 ? '' : 's').' added',
                '/admin/sponsors',
            ),
            $this->step(
                'schedule',
                'Qualification schedule',
                'Generate fair matches for every team, with start times.',
                $qualificationMatches > 0 ? self::DONE : self::TODO,
                $qualificationMatches > 0 ? "{$qualificationMatches} matches scheduled" : 'Not generated',
                '/competition-matches',
            ),
            $this->step(
                'qualifications',
                'Run qualification matches',
                'Load, start, score and post each match from Match Control.',
                match (true) {
                    $qualificationMatches > 0 && $completedQualifications === $qualificationMatches => self::DONE,
                    $completedQualifications > 0 => self::IN_PROGRESS,
                    default => self::TODO,
                },
                "{$completedQualifications} / {$qualificationMatches} played",
                '/match-control',
            ),
            $this->step(
                'alliance-selection',
                'Alliance selection',
                'Top-ranked captains pick their partners.',
                match (true) {
                    $allianceCount > 0 && $this->allianceSelection->isComplete() => self::DONE,
                    $allianceCount > 0 => self::IN_PROGRESS,
                    default => self::TODO,
                },
                $allianceCount > 0 ? "{$allianceCount} alliances" : 'Not started',
                '/admin/alliance-selection',
            ),
            $this->step(
                'playoffs',
                'Playoffs',
                'Best-of-three semifinals and finals, with tiebreakers.',
                match (true) {
                    $finalWinner => self::DONE,
                    $playoffSeries > 0 => self::IN_PROGRESS,
                    default => self::TODO,
                },
                $finalWinner ? 'Champions decided' : ($playoffSeries > 0 ? 'In progress' : 'Not started'),
                '/elimination/bracket',
            ),
            $this->step(
                'archive',
                'Export results',
                'Download the event so it can be kept, shared or imported elsewhere.',
                self::OPTIONAL,
                'Available any time',
                '/dashboard#export',
            ),
        ];
    }

    /**
     * @return array{key: string, title: string, description: string, status: string, detail: string, href: string}
     */
    private function step(string $key, string $title, string $description, string $status, string $detail, string $href): array
    {
        return compact('key', 'title', 'description', 'status', 'detail', 'href');
    }
}
