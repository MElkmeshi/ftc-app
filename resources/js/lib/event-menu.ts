export interface EventMenuLink {
    title: string;
    href: string;
}

export interface EventMenuGroup {
    title: string;
    links: EventMenuLink[];
}

export const EVENT_ADMIN_MENU: EventMenuGroup[] = [
    {
        title: 'Run Event',
        links: [
            { title: 'Event Dashboard', href: '/dashboard' },
            { title: 'Match Control', href: '/match-control' },
            { title: 'Referee Scoring', href: '/referee/scoring' },
            { title: 'Robot Inspection', href: '/inspection' },
            { title: 'Schedule & Results', href: '/competition-matches' },
            { title: 'Event Reports', href: '/reports' },
            { title: 'Emcee Scripts', href: '/scripts' },
            { title: 'Connect Devices', href: '/connect' },
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
            { title: 'Add/Edit Teams', href: '/admin/teams' },
            { title: 'Add/Edit Sponsors', href: '/admin/sponsors' },
            { title: 'Pit Map', href: '/admin/pit-map' },
            { title: 'Score Types', href: '/admin/score-types' },
            { title: 'Alliance Selection', href: '/admin/alliance-selection' },
            { title: 'Manage Awards', href: '/admin/awards' },
            { title: 'Match Timing', href: '/admin/competition-settings' },
        ],
    },
];

export const SERVER_MENU: EventMenuLink[] = [{ title: 'All Events', href: '/events' }];

export const ADMIN_SERVER_MENU: EventMenuLink[] = [
    { title: 'Games', href: '/games' },
    { title: 'Accounts', href: '/accounts' },
];
