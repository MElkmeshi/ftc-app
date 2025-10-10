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

export interface ScoreType {
    id: number;
    name: string;
    points: number;
    target: 'team' | 'alliance';
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
    scores?: Score[];
}

export interface CompetitionMatch {
    id: number;
    number: number;
    start_time: string;
    status: string;
    match_alliances: MatchAlliance[];
    scores?: Score[];
}

export interface ScoreUpdatedEvent {
    match: CompetitionMatch;
}
