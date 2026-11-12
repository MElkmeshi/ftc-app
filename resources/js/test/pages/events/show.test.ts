import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({ Head: () => null, Link: () => null, usePage: () => ({ props: {} }) }));

const { visibleSections } = await import('@/pages/events/show');

const labels = (sections: ReturnType<typeof visibleSections>) => sections.flatMap((section) => section.entries.map((entry) => entry.label));

describe('event home links', () => {
    it('shows a guest only the public pages', () => {
        const sections = visibleSections('/event/x');

        expect(sections.map((section) => section.title)).toEqual(['Event Info', 'Displays']);
        expect(labels(sections)).toContain('Event Reports');
        expect(labels(sections)).not.toContain('Manage Awards');
    });

    it('adds the inspection tools for an inspector and nothing else', () => {
        const sections = visibleSections('/event/x', { inspectRobots: true });

        expect(sections.map((section) => section.title)).toEqual(['Event Info', 'Inspection', 'Displays']);
    });

    it('shows a judge the awards and an emcee the scripts', () => {
        expect(visibleSections('/event/x', { manageAwards: true }).map((section) => section.title)).toEqual(['Event Info', 'Displays', 'Judging']);
        expect(visibleSections('/event/x', { viewScripts: true }).map((section) => section.title)).toEqual(['Event Info', 'Displays', 'GA/Emcee']);
    });

    it('gives an admin every section', () => {
        const sections = visibleSections('/event/x', {
            manageCompetition: true,
            controlMatches: true,
            inspectRobots: true,
            scoreMatches: true,
            manageAwards: true,
            viewScripts: true,
            useFtaTools: true,
        });

        expect(sections).toHaveLength(9);
        expect(labels(sections)).toContain('Event Dashboard');
    });
});
