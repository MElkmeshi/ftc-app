import { eventUrl } from '@/lib/event';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';

export type ConsoleTab = 'schedule' | 'incomplete' | 'active' | 'video';

type LinkedPage = 'settings' | 'alliance-selection' | 'awards';

export const CONSOLE_TABS: { value: ConsoleTab; label: string }[] = [
    { value: 'schedule', label: 'Schedule' },
    { value: 'incomplete', label: 'Incomplete Matches' },
    { value: 'active', label: 'Active Match' },
    { value: 'video', label: 'Video Switch' },
];

const LINKED_PAGES: { value: LinkedPage; label: string; href: string }[] = [
    { value: 'settings', label: 'Settings', href: '/admin/competition-settings?from=match-control' },
    { value: 'alliance-selection', label: 'Alliance Selection', href: '/admin/alliance-selection' },
    { value: 'awards', label: 'Present Awards', href: '/admin/awards' },
];

const tabClass = (active: boolean) => cn('rounded-t-lg px-2 leading-[26px] text-white', active ? 'bg-[#13458f]' : 'bg-[#1e7abb]');

export function MatchControlTabs({ active, onSelect }: { active: ConsoleTab | LinkedPage; onSelect?: (tab: ConsoleTab) => void }) {
    return (
        <nav className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 bg-[#578394] px-2 pt-[3px] text-base" role="tablist">
            {CONSOLE_TABS.map((option) =>
                onSelect ? (
                    <button
                        key={option.value}
                        type="button"
                        role="tab"
                        aria-selected={active === option.value}
                        onClick={() => onSelect(option.value)}
                        className={tabClass(active === option.value)}
                    >
                        {option.label}
                    </button>
                ) : (
                    <Link key={option.value} href={`${eventUrl('/match-control')}#${option.value}`} className={tabClass(false)}>
                        {option.label}
                    </Link>
                ),
            )}
            {LINKED_PAGES.map((page) => (
                <Link key={page.value} href={eventUrl(page.href)} className={tabClass(active === page.value)}>
                    {page.label}
                </Link>
            ))}
        </nav>
    );
}
