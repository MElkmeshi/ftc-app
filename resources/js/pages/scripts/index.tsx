import AppLayout from '@/layouts/app-layout';
import { PrintButton } from '@/layouts/print-layout';
import { announcedSlots, type AwardRow, slotLabel } from '@/lib/award-utils';
import { bs } from '@/lib/bootstrap';
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

interface ScriptsProps extends SharedData {
    scripts: Record<ScriptKind, string>;
    placeholders: string[];
    facts: Record<string, string | number | null>;
    awards: AwardRow[];
    awardsLocked: boolean;
}

type Tab = ScriptKind | 'selection';

function tabOf(url: string): Tab {
    const requested = new URLSearchParams(url.split('?')[1] ?? '').get('tab');

    return requested === 'selection' || requested === 'closing' ? requested : 'opening';
}

const TITLES: Record<ScriptKind, string> = {
    opening: 'Opening Script',
    closing: 'Playoff Awards Script',
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Emcee scripts', href: '/scripts' }];

function teamName(team: TeamName | null): string {
    return team ? [`team ${team.number}`, team.name].filter(Boolean).join(', ') : 'an unknown team';
}

function Blank({ children }: { children: ReactNode }) {
    return <span className={bs.textMuted}>{children}</span>;
}

function FilledText({ text, facts, awards }: { text: string; facts: ScriptsProps['facts']; awards?: ReactNode }) {
    return (
        <>
            {text.split(/\n{2,}/).map((paragraph, paragraphIndex) => {
                if (paragraph.trim() === '{awards}') {
                    return <Fragment key={paragraphIndex}>{awards}</Fragment>;
                }

                return (
                    <p key={paragraphIndex} className="mb-4 whitespace-pre-line">
                        {paragraph.split(/(\{\w+\})/).map((part, partIndex) => {
                            const key = part.match(/^\{(\w+)\}$/)?.[1];

                            if (!key) {
                                return <Fragment key={partIndex}>{part}</Fragment>;
                            }

                            const value = facts[key];

                            return value === null || value === undefined || value === '' ? (
                                <Blank key={partIndex}>[{key.replace(/_/g, ' ')}]</Blank>
                            ) : (
                                <Fragment key={partIndex}>{value}</Fragment>
                            );
                        })}
                    </p>
                );
            })}
        </>
    );
}

function AwardsScript({ awards }: { awards: AwardRow[] }) {
    if (awards.length === 0) {
        return (
            <p className="mb-4">
                <Blank>[No awards have been set up yet.]</Blank>
            </p>
        );
    }

    return (
        <>
            {awards.map((award) => (
                <div key={award.id} className="py-[.8em]">
                    <div className="mr-1 inline-block text-[1.1em] font-bold">{award.name}</div>
                    <p className="mb-4 whitespace-pre-line">{award.description}</p>
                    <div className="ml-12">
                        {announcedSlots(award).map((winner) => {
                            const label = slotLabel(winner.place);
                            const location = winner.team?.city;

                            return (
                                <div key={winner.place} className="px-[.5em] py-[.2em]">
                                    <div className="inline-block w-[8em] font-bold">{label}</div>
                                    <div className="inline-block">
                                        {winner.comment && (
                                            <>
                                                <div>Here is what the Judges have to say about the {label.toLowerCase()} of this Award:</div>
                                                <div className="whitespace-pre-line">{winner.comment}</div>
                                            </>
                                        )}
                                        {!award.is_team_award && winner.recipient && `${winner.recipient} ${winner.team ? ' of Team ' : ''}`}
                                        {winner.team && `${winner.team.number} ${winner.team.name}${location ? ` - from ${location}` : ''}`}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </>
    );
}

function SelectionScript({ groups }: { groups: SelectionGroup[] }) {
    if (groups.length === 0) {
        return <p>Alliance selection has not yet been started by the scorekeeper.</p>;
    }

    const picking = groups.find((group) => group.picked === null);

    return (
        <div className="text-[1.2em]">
            <p className="mb-4">
                It&apos;s time for alliance selection! Our {groups.length} alliance captains, in ranking order, will each invite one team to join them
                for the playoffs.
            </p>
            {groups.map((group) => (
                <p key={group.seed} className={cn('mb-4', group.picked === null && group !== picking && bs.textMuted)}>
                    {group.picked ? (
                        <>
                            Alliance {group.seed}: {teamName(group.captain)} has chosen {teamName(group.picked)}!
                        </>
                    ) : group.pending ? (
                        <>
                            {teamName(group.pending)}, {teamName(group.captain)} has invited you to join alliance {group.seed}. Do you accept?
                        </>
                    ) : (
                        <>
                            Alliance {group.seed} captain, {teamName(group.captain)}
                            {group === picking ? ', please make your invitation.' : ''}
                        </>
                    )}
                </p>
            ))}
            {!picking && <p className="mb-4">That completes alliance selection. Give it up for our playoff alliances!</p>}
        </div>
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
        <div className="text-base">
            <textarea
                aria-label="Script text"
                className={cn(bs.formControl, 'mb-2 min-h-96')}
                value={form.data.text}
                onChange={(changeEvent) => form.setData('text', changeEvent.target.value)}
            />
            <p className={cn(bs.textMuted, 'mb-4 text-[.875em]')}>
                Leave a blank line between paragraphs. Filled in automatically:{' '}
                {placeholders
                    .filter((placeholder) => kind === 'closing' || placeholder !== 'awards')
                    .map((placeholder) => `{${placeholder}}`)
                    .join(' ')}
                {kind === 'closing' && ' — {awards} on its own line is where the awards are read.'}
            </p>
            <div className="flex flex-wrap gap-2">
                <button type="button" className={bs.btnPrimary} disabled={form.processing} onClick={() => save(form.data.text)}>
                    Save
                </button>
                <button type="button" className={bs.btnSecondary} onClick={onDone}>
                    Cancel
                </button>
                <button type="button" className={bs.btnOutlineSecondary} disabled={form.processing} onClick={() => save(null)}>
                    Reset to Default
                </button>
            </div>
        </div>
    );
}

/**
 * Scripts for the emcee (FTC Live's opening, alliance selection and closing
 * scripts), filled in with this event's details as they happen.
 */
export default function Scripts() {
    const { url, props } = usePage<ScriptsProps>();
    const { auth, event, scripts, placeholders, facts, awards, awardsLocked } = props;
    const { value: selection = [] } = useProp<SelectionGroup[]>('selection');
    const [editing, setEditing] = useState(false);
    const tab = tabOf(url);
    const canEdit = auth.user?.role === 'admin';

    return (
        <AppLayout breadcrumbs={breadcrumbs} hideBack>
            <Head title="Emcee scripts" />

            {tab === 'selection' ? (
                <div className="text-base leading-normal text-[#212529]">
                    <SelectionScript groups={selection} />
                </div>
            ) : (
                <div className="text-[1.2em] leading-normal text-[#212529]">
                    <div className="-mx-3 flex flex-wrap justify-center print:mx-0">
                        {canEdit && !editing ? (
                            <button type="button" title="Edit" onClick={() => setEditing(true)} className={cn(bs.btnLight, 'w-1/12 print:hidden')}>
                                <Pencil className="inline size-8" strokeWidth={2.5} />
                            </button>
                        ) : (
                            <div className="w-1/12 print:hidden" />
                        )}
                        <h2 className={cn(bs.h2, 'w-10/12 px-3 text-center')}>
                            {event?.name} {TITLES[tab]}
                        </h2>
                        <PrintButton className="w-1/12" />
                    </div>
                    <br />
                    {editing ? (
                        <ScriptEditor key={tab} kind={tab} text={scripts[tab]} placeholders={placeholders} onDone={() => setEditing(false)} />
                    ) : (
                        <>
                            {tab === 'closing' && !awardsLocked && (
                                <div role="alert" className={bs.alertDanger}>
                                    <AlertTriangle className="inline size-[1em] align-[-.125em]" />
                                    &nbsp; Awards have not yet been finalized! Please check with with your Scorekeeper and Judge Advisor to ensure
                                    awards have been finalized before the first awards break. Individual awards can still be presented.
                                </div>
                            )}
                            <FilledText text={scripts[tab]} facts={facts} awards={<AwardsScript awards={awards} />} />
                        </>
                    )}
                </div>
            )}
        </AppLayout>
    );
}
