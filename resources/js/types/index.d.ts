import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Auth {
    user: User;
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
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
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
}

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

export interface ScoreType {
    id: number;
    name: string;
    points: number;
    target: 'team' | 'alliance';
    group_id: number | null;
    group?: Group;
}

export interface Score {
    id: number;
    match_id: number;
    team_id: number | null;
    alliance_id?: number | null;
    score_type_id: number;
    score_type?: ScoreType;
    created_at: string;
}

export interface MatchAlliance {
    id: number;
    team: Team;
    alliance: Alliance;
    score: number;
    alliance_group_id: number | null;
    scores?: Score[];
}

export interface CompetitionMatch {
    id: number;
    number: number;
    type: 'qualification' | 'elimination';
    round: string | null;
    elimination_series_id: number | null;
    start_time: string;
    started_at: string | null;
    ended_at: string | null;
    status: string;
    match_alliances: MatchAlliance[];
    scores?: Score[];
}

export type MatchPhase = 'pre-match' | 'autonomous' | 'transition' | 'teleop' | 'endgame' | 'post-match';

export interface MatchStatusChangedEvent {
    match: CompetitionMatch;
    action: 'started' | 'ended' | 'cancelled' | 'loaded';
}

export interface ScoreUpdatedEvent {
    match: CompetitionMatch;
}

export interface TeamDisplay {
    team_id: number;
    team_number: string;
    team_name: string;
    alliance_color: string;
    team_score: number;
    alliance_score: number;
    total_score: number;
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
    groups: AllianceGroup[];
}

export interface DashboardStats {
    total_teams: number;
    total_matches: number;
    completed_matches: number;
    ongoing_match: { id: number; number: number } | null;
}

