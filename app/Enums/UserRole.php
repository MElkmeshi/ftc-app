<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Fta = 'fta';
    case FtaaCsa = 'ftaa_csa';
    case HeadReferee = 'head_referee';
    case Referee = 'referee';
    case Scorer = 'scorer';
    case LeadInspector = 'lead_inspector';
    case Inspector = 'inspector';
    case Judge = 'judge';
    case Emcee = 'emcee';
    case Viewer = 'viewer';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Admin / Scorekeeper',
            self::Fta => 'FTA',
            self::FtaaCsa => 'FTAA / CSA',
            self::HeadReferee => 'Head Referee',
            self::Referee => 'Referee',
            self::Scorer => 'Official Scorer',
            self::LeadInspector => 'Lead Inspector',
            self::Inspector => 'Inspector',
            self::Judge => 'Judge',
            self::Emcee => 'Emcee/Game Announcer',
            self::Viewer => 'Viewer',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Admin => 'Sets up events, runs match control and edits everything.',
            self::Fta => 'Runs match control, inspects robots and reads the scripts.',
            self::FtaaCsa => 'Uses the FTA notepad.',
            self::HeadReferee => 'Starts and stops matches and commits scores.',
            self::Referee => 'Scores matches from a tablet.',
            self::Scorer => 'Scores matches from a tablet.',
            self::LeadInspector => 'Inspects robots and can override any inspection status.',
            self::Inspector => 'Inspects robots and records the results.',
            self::Judge => 'Enters and presents awards.',
            self::Emcee => 'Reads the ceremony scripts and announcer reports.',
            self::Viewer => 'Can sign in but only sees public pages.',
        };
    }

    /**
     * @return list<string>
     */
    public function abilities(): array
    {
        return match ($this) {
            self::Admin => ['manage-competition', 'control-matches', 'inspect-robots', 'override-inspection', 'score-matches', 'manage-awards', 'view-scripts', 'use-fta-tools'],
            self::Fta => ['control-matches', 'inspect-robots', 'view-scripts', 'use-fta-tools'],
            self::FtaaCsa => ['use-fta-tools'],
            self::HeadReferee => ['control-matches', 'score-matches', 'view-scripts', 'use-fta-tools'],
            self::Referee, self::Scorer => ['score-matches'],
            self::LeadInspector => ['inspect-robots', 'override-inspection'],
            self::Inspector => ['inspect-robots'],
            self::Judge => ['manage-awards'],
            self::Emcee => ['view-scripts'],
            self::Viewer => [],
        };
    }

    /**
     * @return list<array{value: string, label: string, description: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $role): array => ['value' => $role->value, 'label' => $role->label(), 'description' => $role->description()],
            self::cases(),
        );
    }
}
