import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({ Head: () => null, Link: () => null, usePage: () => ({ props: {} }) }));

const { visibleSections } = await import('@/pages/events/show');

const labels = (sections: ReturnType<typeof visibleSections>) => sections.flatMap((section) => section.entries.map((entry) => entry.label));

describe('event home links', () => {
    it('shows a guest only the public pages', () => {
        const sections = visibleSections('/event/x');

        expect(sections.map((section) => section.title)).toEqual(['Event Info', 'Displays']);
        expect(labels(sections)).not.toContain('Event Reports');
    });

    it('adds the inspection tools for an inspector and nothing else', () => {
        const sections = visibleSections('/event/x', { inspectRobots: true });

        expect(sections.map((section) => section.title)).toEqual(['Event Info', 'Inspection', 'Displays']);
    });

    it('gives an admin every section', () => {
        const sections = visibleSections('/event/x', { manageCompetition: true, controlMatches: true, inspectRobots: true, scoreMatches: true });

        expect(sections).toHaveLength(9);
        expect(labels(sections)).toContain('Event Dashboard');
    });
});
