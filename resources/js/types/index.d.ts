import { type MatchTimingConfig } from '@/hooks/use-match-timer';
import { type DisplayConfig } from '@/lib/display-config';
import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export type Ability =
    | 'manageCompetition'
    | 'controlMatches'
    | 'inspectRobots'
    | 'scoreMatches'
    | 'overrideInspection'
    | 'manageAwards'
    | 'viewScripts'
    | 'useFtaTools';

export type UserRoleValue =
    | 'admin'
    | 'fta'
    | 'ftaa_csa'
    | 'head_referee'
    | 'referee'
    | 'scorer'
    | 'lead_inspector'
    | 'inspector'
    | 'judge'
    | 'emcee'
    | 'viewer';

export interface Auth {
    user: User;
    role: string | null;
    can: Record<Ability, boolean>;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    /** The event being viewed; null on server-wide pages (event list, settings). */
    event: CompetitionEvent | null;
    /** The game being edited, or the game the current event plays, with its pictures. */
    currentGame: GameLook | null;
    [key: string]: unknown;
}

/** The pictures that make a game look like itself on displays and tablets. */
export interface GameLook {
    id: number;
    name: string;
    logo_url: string | null;
    background_url: string | null;
}

export type EventTypeValue = 'scrimmage' | 'league_meet' | 'qualifier' | 'championship' | 'off_season' | 'workshop' | 'other';

export interface EventTypeOption {
    value: EventTypeValue;
    label: string;
}

/** A game an event can play, as offered in pickers. */
export interface GameOption {
    id: number;
    name: string;
}

/** An event playing a game, flagged when editing the game would change matches it already played. */
export interface GameEventSummary {
    code: string;
    name: string;
    has_played_matches: boolean;
}

/** The game a scoring or timing page is editing. */
export interface GameSummary extends GameLook {
    events: GameEventSummary[];
}

/** A competition hosted on this server (named to avoid clashing with the DOM `Event`). */
export type DisplayModeValue =
    | 'blank'
    | 'preview'
    | 'match'
    | 'results'
    | 'rankings'
    | 'bracket'
    | 'alliance_selection'
    | 'message'
    | 'award'
    | 'sponsors'
    | 'video'
    | 'slideshow'
    | 'wifi'
    | 'key'
    | 'safety'
    | 'online_results'
    | 'inspection';

export interface AwardRecipient {
    team_number: string | null;
    team_name: string | null;
    recipient: string | null;
}

export interface PresentedAward {
    id: number;
    name: string;
    description: string | null;
    places: number;
    revealed: { place: number; winners: AwardRecipient[] }[];
}

/** What every audience display is showing, as chosen in match control. */
export interface AudienceDisplayState {
    mode: DisplayModeValue;
    match_id: number | null;
    loaded_match_id?: number | null;
    /** The text for the message screen (kept after switching away, so it can be shown again). */
    message?: string | null;
    changed_at: string | null;
    award?: PresentedAward | null;
    sponsors?: Sponsor[] | null;
}

export interface Sponsor {
    id: number;
    name: string;
    level: string | null;
    logo_url: string | null;
    position?: number;
}

/** A display screen that is open right now, as listed in match control. */
export interface ConnectedDisplay {
    id: string;
    ip: string | null;
    config: DisplayConfig;
    last_seen: string;
}

export interface CompetitionEvent {
    id: number;
    game_id: number | null;
    code: string;
    name: string;
    type: EventTypeValue;
    venue: string | null;
    timezone: string;
    start_date: string | null;
    end_date: string | null;
    field_count: number;
    archived_at: string | null;
    teams_count?: number;
    matches_count?: number;
}

export interface User {
    id: number;
    name: string;
    email: string;
    role?: UserRoleValue;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

export interface Team {
    id: number;
    number: string;
    name: string;
    organization?: string | null;
    city?: string | null;
    rookie_year?: number | null;
}

export type TeamInput = Pick<Team, 'name' | 'organization' | 'city' | 'rookie_year'> & { number: number };

export interface Alliance {
    id: number;
    color: string;
}

export interface Group {
    id: number;
    name: string;
    description: string | null;
    display_order: number;
}

export type ScoreKind = 'count' | 'toggle' | 'choice';

/** Which of an alliance's two referees enters a score type. */
export type RefereeRole = 'scoring' | 'penalty';

/** Who a score type's points count for: the alliance it is entered for, or its opponent (FTC-style fouls). */
export type PointsAwardedTo = 'own' | 'opponent';

export interface ScoreType {
    id: number;
    name: string;
    points: number;
    target: 'team' | 'alliance';
    /** count: tapped any number of times · toggle: yes or no · choice: one option of its choice set. */
    kind: ScoreKind;
    /** Name shared by the options of a "one of" choice, e.g. "Ascent". */
    choice_set: string | null;
    /** Entered by the alliance's scoring referee or its penalty referee. */
    referee: RefereeRole;
    awarded_to: PointsAwardedTo;
    group_id: number | null;
    /** A picture of the game piece or action, when the game has one. */
    icon_url?: string | null;
    group?: Group;
}

export interface Score {
    id: number;
    match_id: number;
    team_id: number | null;
    alliance_id?: number | null;
    points?: number;
    score_type_id: number | null;
    score_type?: ScoreType | null;
    /** Only on scores the tablet created itself; the server does not send it. */
    created_at?: string;
}

export type TeamCard = 'yellow' | 'red';

export interface MatchAlliance {
    id: number;
    team: Team;
    alliance: Alliance;
    score: number;
    card?: TeamCard | null;
    ready?: boolean;
    alliance_group_id: number | null;
    scores?: Score[];
}

export interface CompetitionMatch {
    id: number;
    number: number;
    type: 'practice' | 'qualification' | 'elimination';
    round: string | null;
    /** Which field the match is played on (1 at a single-field event). */
    field?: number;
    elimination_series_id: number | null;
    start_time: string;
    started_at: string | null;
    duration_ms: number | null;
    /** Every phase boundary, pinned when the match started; null before then. */
    timing?: MatchTimingConfig | null;
    /** Goes up with every change to the match or its scores. */
    revision?: number;
    ended_at: string | null;
    status: string;
    match_alliances: MatchAlliance[];
    scores?: Score[];
    /** Alliances whose referees submitted their scores (cleared when the match starts). */
    submissions?: ScoreSubmission[] | null;
    /** Penalty referee seats that joined this match; the head referee's commit waits for them too. */
    referee_seats?: { alliance_id: number; role: RefereeRole }[] | null;
    review_required?: boolean;
}

export interface MatchControlSettings {
    live_scoring: boolean;
    require_ready: boolean;
    referee_tablets: boolean;
    flip_alliances: boolean;
    recorded_countdown: boolean;
    active_phase: CompetitionMatch['type'] | null;
}

export interface MatchNote {
    id: number;
    match_id: number;
    summary: string;
    detail: string | null;
    teams: string[] | null;
    created_at: string;
    author?: { id: number; name: string } | null;
}

export interface ScoreSubmission {
    alliance_id: number;
    /** Missing on submissions made before referees had roles: those were scoring. */
    role?: RefereeRole;
    /** Name of the referee who submitted. */
    by: string;
    at: string;
}

/** One robot (team_id) or a whole alliance (alliance_id) being scored. */
export interface ScoreTarget {
    teamId?: number;
    allianceId?: number;
}

export type MatchPhase = 'pre-match' | 'autonomous' | 'transition' | 'teleop' | 'endgame' | 'post-match';

/** `match` is left out when the whole match would not fit in one Reverb message; refetch it by `match_id`. */
export interface MatchBroadcast {
    match_id: number;
    match?: CompetitionMatch;
}

export interface MatchStatusChangedEvent extends MatchBroadcast {
    action: 'started' | 'ended' | 'cancelled' | 'loaded' | 'scheduled';
}

export type ScoreUpdatedEvent = MatchBroadcast;

export interface TeamDisplay {
    team_id: number;
    team_number: string;
    team_name: string;
    alliance_color: string;
    team_score: number;
    alliance_score: number;
    total_score: number;
    played: number;
    wins: number;
    losses: number;
    ties: number;
    ranking_points: number;
    average_score: number;
    highest_score: number;
    rank?: number;
}

export interface AllianceGroup {
    id: number;
    seed: number;
    captain_team: Team;
    picked_team: Team | null;
    pending_team: Team | null;
}

export interface SeriesResult {
    group_1_wins: number;
    group_2_wins: number;
    completed_matches: number;
    total_matches: number;
}

export interface EliminationSeries {
    id: number;
    round: string;
    alliance_group1: AllianceGroup;
    alliance_group2: AllianceGroup;
    winner_alliance_group_id: number | null;
    winner: AllianceGroup | null;
    status: 'pending' | 'in_progress' | 'completed';
    matches: CompetitionMatch[];
    result?: SeriesResult;
}

export interface EliminationBracket {
    series: EliminationSeries[];
    alliance_groups: AllianceGroup[];
}

export interface AllianceSelectionStatus {
    started: boolean;
    complete: boolean;
    current_pick_seed: number | null;
    groups: AllianceGroup[];
    declined_teams: Team[];
}

export interface AllianceSelectionUpdatedEvent {
    action: 'started' | 'invited' | 'accepted' | 'declined' | 'reset';
    groups: AllianceGroup[];
    declined_teams: Team[];
    complete: boolean;
    current_pick_seed: number | null;
}

export interface DashboardStats {
    total_teams: number;
    total_matches: number;
    completed_matches: number;
    ongoing_match: { id: number; number: number } | null;
}
