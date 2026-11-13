import { EnterAwards } from '@/components/awards/enter-awards';
import { ManageAwards } from '@/components/awards/manage-awards';
import { type AwardPresentation, PresentAwards } from '@/components/awards/present-awards';
import { SavingIndicator } from '@/components/awards/saving-indicator';
import { useSaveQueue } from '@/hooks/use-save-queue';
import AppLayout from '@/layouts/app-layout';
import { type AwardRow, type AwardTeam } from '@/lib/award-utils';
import { bs } from '@/lib/bootstrap';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

interface AwardsProps extends SharedData {
    awards: AwardRow[];
    teams: AwardTeam[];
    locked: boolean;
    presenting: AwardPresentation | null;
}

type AwardsTab = 'manage' | 'enter' | 'present';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Awards', href: '/admin/awards' }];

const TABS: { key: AwardsTab; label: string }[] = [
    { key: 'manage', label: 'Manage Awards' },
    { key: 'enter', label: 'Enter Awards' },
    { key: 'present', label: 'Present Awards' },
];

export default function Awards() {
    const { event, awards, teams, locked, presenting, errors } = usePage<AwardsProps>().props;
    const [tab, setTab] = useState<AwardsTab>('enter');
    const { save, pending, failed } = useSaveQueue();
    const base = `/event/${event?.code}`;
    const problems = Object.values(errors as Record<string, string>);

    return (
        <AppLayout breadcrumbs={breadcrumbs} hideBack>
            <Head title="Awards" />

            <div>
                <div className="text-center print:hidden">
                    <h1 className={bs.h1}>Awards Manager</h1>
                    <h5 className={bs.h5}>
                        [{event?.code}] {event?.name}
                    </h5>
                    <br />
                    <div className="mb-6 flex flex-wrap">
                        <Link
                            href={base}
                            className={cn(
                                bs.btnLight,
                                'mr-2 border-[#212529] bg-[#212529] text-white no-underline hover:border-[#373b3e] hover:bg-[#424649]',
                            )}
                        >
                            Exit
                        </Link>
                        {TABS.map((entry) => (
                            <button
                                key={entry.key}
                                type="button"
                                className={`cursor-pointer rounded-lg px-4 py-2 ${tab === entry.key ? 'bg-[#0d6efd] text-white' : 'text-[#0d6efd] hover:text-[#0a58ca]'}`}
                                onClick={() => setTab(entry.key)}
                            >
                                {entry.label}
                            </button>
                        ))}
                    </div>
                </div>

                {problems.length > 0 && (
                    <div role="alert" className={bs.alertDanger}>
                        {problems.map((problem) => (
                            <div key={problem}>{problem}</div>
                        ))}
                    </div>
                )}

                {tab === 'manage' && <ManageAwards awards={awards} base={base} save={save} />}
                {tab === 'enter' && <EnterAwards awards={awards} teams={teams} base={base} locked={locked} save={save} />}
                {tab === 'present' && <PresentAwards awards={awards} base={base} locked={locked} presenting={presenting} />}
                {tab !== 'present' && <SavingIndicator pending={pending} failed={failed} />}
            </div>
        </AppLayout>
    );
}
