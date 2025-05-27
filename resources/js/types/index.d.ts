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

export interface MatchAlliance {
    id: number;
    team: Team;
    alliance: Alliance;
    score: number;
}

export interface CompetitionMatch {
    id: number;
    number: number;
    start_time: string;
    status: string;
    match_alliances: MatchAlliance[];
}

export interface ScoreUpdatedEvent {
    match: CompetitionMatch;
}
