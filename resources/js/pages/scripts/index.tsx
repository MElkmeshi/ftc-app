import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { placeLabel } from '@/lib/award-utils';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData, type Team } from '@/types';
import { Head, useForm, usePage, useProp } from '@inertiajs/react';
import { AlertTriangle, Pencil } from 'lucide-react';
import { Fragment, type ReactNode, useState } from 'react';

type ScriptKind = 'opening' | 'closing';
type TeamName = Pick<Team, 'number' | 'name'>;

interface SelectionGroup {
    seed: number;
    captain: TeamName | null;
    picked: TeamName | null;
    pending: TeamName | null;
}

interface ScriptAward {
    id: number;
    name: string;
    description: string | null;
    places: number;
    winners: { id: number; place: number; recipient: string | null; team: TeamName | null }[];
}

interface ScriptsProps extends SharedData {
    scripts: Record<ScriptKind, string>;
    placeholders: string[];
    facts: Record<string, string | number | null>;
    awards: ScriptAward[];
    awardsLocked: boolean;
}

type Tab = ScriptKind | 'selection';

const TABS: { value: Tab; label: string }[] = [
    { value: 'opening', label: 'Opening' },
    { value: 'selection', label: 'Alliance selection' },
    { value: 'closing', label: 'Awards & closing' },
];

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Emcee scripts', href: '/scripts' }];

function teamName(team: TeamName | null): string {
    return team ? [`team ${team.number}`, team.name].filter(Boolean).join(', ') : 'an unknown team';
}

function Blank({ children }: { children: ReactNode }) {
    return <span className="rounded bg-amber-100 px-1 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">{children}</span>;
}

function FilledText({ text, facts, awards }: { text: string; facts: ScriptsProps['facts']; awards?: ReactNode }) {
    return (
        <>
            {text.split(/\n{2,}/).map((paragraph, paragraphIndex) => {
                if (paragraph.trim() === '{awards}') {
                    return <Fragment key={paragraphIndex}>{awards}</Fragment>;
                }

                return (
                    <p key={paragraphIndex} className="whitespace-pre-line">
                        {paragraph.split(/(\{\w+\})/).map((part, partIndex) => {
                            const key = part.match(/^\{(\w+)\}$/)?.[1];

                            if (!key) {
                                return <Fragment key={partIndex}>{part}</Fragment>;
                            }

                            const value = facts[key];

                            return value === null || value === undefined || value === '' ? (
                                <Blank key={partIndex}>[{key.replace(/_/g, ' ')}]</Blank>
                            ) : (
                                <strong key={partIndex}>{value}</strong>
                            );
                        })}
                    </p>
                );
            })}
        </>
    );
}

function AwardsScript({ awards, locked }: { awards: ScriptAward[]; locked: boolean }) {
    if (awards.length === 0) {
        return (
            <p>
                <Blank>[No awards have been set up yet.]</Blank>
            </p>
        );
    }

    return (
        <div className="space-y-6 border-l-4 border-amber-400 pl-4">
            {!locked && (
                <p className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="size-4" /> The award results are not locked yet, so winners may still change.
                </p>
            )}
            {awards.map((award) => (
                <div key={award.id} className="space-y-2">
                    <h3 className="text-2xl font-bold">{award.name}</h3>
                    {award.description && <p className="italic">{award.description}</p>}
                    {Array.from({ length: award.places }, (_, index) => award.places - index).map((place) => {
                        const winners = award.winners.filter((winner) => winner.place === place);

                        return (
                            <p key={place}>
                                {award.places === 1 ? 'The winner is' : `In ${placeLabel(place, award.places).toLowerCase()}:`}{' '}
                                {winners.length === 0 ? (
                                    <Blank>[not entered]</Blank>
                                ) : (
                                    <strong>
                                        {winners
                                            .map((winner) =>
                                                [winner.team ? teamName(winner.team) : null, winner.recipient].filter(Boolean).join(', '),
                                            )
                                            .join(' and ')}
                                    </strong>
                                )}
                                !
                            </p>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

function SelectionScript({ groups }: { groups: SelectionGroup[] }) {
    if (groups.length === 0) {
        return (
            <>
                <p>
                    <Blank>[Alliance selection has not started. Start it from the alliance selection page and this script follows along.]</Blank>
                </p>
                <p>
                    It&apos;s time for alliance selection! The top-ranked teams are our alliance captains. Each captain will invite one team to join
                    their alliance for the playoffs. Captains, please come to the front.
                </p>
            </>
        );
    }

    const picking = groups.find((group) => group.picked === null);

    return (
        <>
            <p>
                It&apos;s time for alliance selection! Our {groups.length} alliance captains, in ranking order, will each invite one team to join them
                for the playoffs.
            </p>
            <ol className="space-y-3">
                {groups.map((group) => {
                    const isCurrent = group === picking;

                    return (
                        <li
                            key={group.seed}
                            className={cn('rounded-lg p-3', isCurrent ? 'bg-primary/10 ring-primary ring-2' : group.picked === null && 'opacity-50')}
                        >
                            {group.picked ? (
                                <>
                                    Alliance {group.seed}: <strong>{teamName(group.captain)}</strong> has chosen{' '}
                                    <strong>{teamName(group.picked)}</strong>!
                                </>
                            ) : group.pending ? (
                                <>
                                    <strong>{teamName(group.pending)}</strong>, {teamName(group.captain)} has invited you to join alliance{' '}
                                    {group.seed}. Do you accept?
                                </>
                            ) : (
                                <>
                                    Alliance {group.seed} captain, <strong>{teamName(group.captain)}</strong>
                                    {isCurrent ? ', please make your invitation.' : ''}
                                </>
                            )}
                        </li>
                    );
                })}
            </ol>
            {!picking && <p>That completes alliance selection. Give it up for our playoff alliances!</p>}
        </>
    );
}

function ScriptEditor({ kind, text, placeholders, onDone }: { kind: ScriptKind; text: string; placeholders: string[]; onDone: () => void }) {
    const { event } = usePage<SharedData>().props;
    const form = useForm({ text });

    const save = (value: string | null) => {
        form.transform(() => ({ text: value }));
        form.put(`/event/${event?.code}/scripts/${kind}`, { preserveScroll: true, onSuccess: onDone });
    };

    return (
        <div className="space-y-3">
            <textarea
                aria-label="Script text"
                className="border-input bg-background min-h-96 w-full rounded-md border p-3 font-mono text-sm"
                value={form.data.text}
                onChange={(changeEvent) => form.setData('text', changeEvent.target.value)}
            />
            <p className="text-muted-foreground text-sm">
                Leave a blank line between paragraphs. Filled in automatically:{' '}
                {placeholders
                    .filter((placeholder) => kind === 'closing' || placeholder !== 'awards')
                    .map((placeholder) => (
                        <code key={placeholder} className="bg-muted mr-1 rounded px-1">{`{${placeholder}}`}</code>
                    ))}
                {kind === 'closing' && ' — {awards} on its own line is where the awards are read.'}
            </p>
            <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={form.processing} onClick={() => save(form.data.text)}>
                    Save
                </Button>
                <Button size="sm" variant="outline" onClick={onDone}>
                    Cancel
                </Button>
                <Button size="sm" variant="ghost" disabled={form.processing} onClick={() => save(null)}>
                    Reset to the default script
                </Button>
            </div>
        </div>
    );
}

/**
 * Scripts for the emcee (FTC Live's opening, alliance selection and closing
 * scripts), filled in with this event's details as they happen.
 */
export default function Scripts() {
    const { auth, scripts, placeholders, facts, awards, awardsLocked } = usePage<ScriptsProps>().props;
    const { value: selection = [] } = useProp<SelectionGroup[]>('selection');
    const [tab, setTab] = useState<Tab>('opening');
    const [editing, setEditing] = useState(false);
    const canEdit = auth.user?.role === 'admin' && tab !== 'selection';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Emcee scripts" />

            <div className="mx-auto max-w-3xl space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <div className="flex gap-1 border-b" role="tablist">
                        {TABS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                role="tab"
                                aria-selected={tab === option.value}
                                onClick={() => {
                                    setTab(option.value);
                                    setEditing(false);
                                }}
                                className={cn(
                                    '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
                                    tab === option.value ? 'border-primary' : 'text-muted-foreground border-transparent',
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    {canEdit && !editing && (
                        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                            <Pencil className="mr-1 size-4" /> Edit script
                        </Button>
                    )}
                </div>

                {editing && tab !== 'selection' ? (
                    <ScriptEditor key={tab} kind={tab} text={scripts[tab]} placeholders={placeholders} onDone={() => setEditing(false)} />
                ) : (
                    <article className="space-y-4 text-xl leading-relaxed">
                        {tab === 'selection' ? (
                            <SelectionScript groups={selection} />
                        ) : (
                            <FilledText text={scripts[tab]} facts={facts} awards={<AwardsScript awards={awards} locked={awardsLocked} />} />
                        )}
                    </article>
                )}
            </div>
        </AppLayout>
    );
}
