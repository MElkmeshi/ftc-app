import { type Ability } from '@/types';

export interface EventMenuLink {
    title: string;
    href: string;
    ability?: Ability;
}

export interface EventMenuGroup {
    title: string;
    links: EventMenuLink[];
}

export const EVENT_ADMIN_MENU: EventMenuGroup[] = [
    {
        title: 'Run Event',
        links: [
            { title: 'Event Dashboard', href: '/dashboard', ability: 'manageCompetition' },
            { title: 'Match Control', href: '/match-control', ability: 'controlMatches' },
            { title: 'Referee Scoring', href: '/referee/scoring', ability: 'scoreMatches' },
            { title: 'Head Referee', href: '/head-referee', ability: 'controlMatches' },
            { title: 'Robot Inspection', href: '/inspection', ability: 'inspectRobots' },
            { title: 'Schedule & Results', href: '/competition-matches', ability: 'manageCompetition' },
            { title: 'Event Reports', href: '/reports', ability: 'controlMatches' },
            { title: 'Emcee Scripts', href: '/scripts', ability: 'controlMatches' },
            { title: 'Connect Devices', href: '/connect', ability: 'controlMatches' },
        ],
    },
    {
        title: 'Displays',
        links: [
            { title: 'Scoring/Timing Display', href: '/display' },
            { title: 'Rankings Display', href: '/referee/display' },
            { title: 'Alliance Selection Display', href: '/alliance-selection/display' },
            { title: 'Playoff Bracket', href: '/elimination/bracket' },
        ],
    },
    {
        title: 'Setup',
        links: [
            { title: 'Add/Edit Teams', href: '/admin/teams', ability: 'manageCompetition' },
            { title: 'Add/Edit Sponsors', href: '/admin/sponsors', ability: 'manageCompetition' },
            { title: 'Pit Map', href: '/admin/pit-map', ability: 'manageCompetition' },
            { title: 'Score Types', href: '/admin/score-types', ability: 'manageCompetition' },
            { title: 'Alliance Selection', href: '/admin/alliance-selection', ability: 'manageCompetition' },
            { title: 'Manage Awards', href: '/admin/awards', ability: 'manageCompetition' },
            { title: 'Match Timing', href: '/admin/competition-settings', ability: 'manageCompetition' },
        ],
    },
];

export const SERVER_MENU: EventMenuLink[] = [{ title: 'All Events', href: '/events' }];

export const ADMIN_SERVER_MENU: EventMenuLink[] = [
    { title: 'Games', href: '/games' },
    { title: 'Accounts', href: '/accounts' },
];
