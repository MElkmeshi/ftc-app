import { eventUrl } from '@/lib/event';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';

export type ConsoleTab = 'schedule' | 'incomplete' | 'active' | 'settings' | 'alliance' | 'video' | 'awards';

export const CONSOLE_TABS: { value: ConsoleTab; label: string }[] = [
    { value: 'schedule', label: 'Schedule' },
    { value: 'incomplete', label: 'Incomplete Matches' },
    { value: 'active', label: 'Active Match' },
    { value: 'settings', label: 'Settings' },
    { value: 'alliance', label: 'Alliance Selection' },
    { value: 'video', label: 'Video Switch' },
    { value: 'awards', label: 'Present Awards' },
];

const tabClass = (active: boolean) => cn('rounded-t-lg px-2 leading-[26px] text-white', active ? 'bg-[#13458f]' : 'bg-[#1e7abb]');

export function MatchControlTabs({ active, onSelect }: { active: ConsoleTab; onSelect?: (tab: ConsoleTab) => void }) {
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
                    <Link key={option.value} href={`${eventUrl('/match-control')}#${option.value}`} className={tabClass(active === option.value)}>
                        {option.label}
                    </Link>
                ),
            )}
        </nav>
    );
}
