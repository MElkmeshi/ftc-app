import { TeamSelect } from '@/components/awards/team-select';
import { oneOffSaveKey, type QueueSave } from '@/hooks/use-save-queue';
import { type AwardRow, type AwardSlot, awardSummary, type AwardTeam, isAwardGiven, slotLabel, slotsOf } from '@/lib/award-utils';
import { bs } from '@/lib/bootstrap';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface SlotDraft {
    recipient: string;
    team: AwardTeam | null;
    comment: string;
}

type SlotDrafts = Record<string, SlotDraft>;

const NAME_MAX_LENGTH = 120;
const COMMENT_MAX_LENGTH = 5000;

const listItem = 'relative block w-full cursor-pointer border px-4 py-2 text-left not-first:-mt-px first:rounded-t-lg last:rounded-b-lg';
const listVariants = {
    given: {
        idle: 'border-[#a3cfbb] bg-[#d1e7dd] text-[rgba(33,37,41,0.75)] hover:bg-[#a3cfbb] hover:text-black',
        active: 'z-[2] border-[#0a3622] bg-[#0a3622] text-[#d1e7dd]',
    },
    notGiven: {
        idle: 'border-[#c4c8cb] bg-[#e2e3e5] text-[rgba(33,37,41,0.75)] hover:bg-[#c4c8cb] hover:text-black',
        active: 'z-[2] border-[#2b2f32] bg-[#2b2f32] text-[#e2e3e5]',
    },
};

function draftKey(awardId: number, place: number): string {
    return `${awardId}:${place}`;
}

function draftOf(slot: AwardSlot): SlotDraft {
    return { recipient: slot.winner?.recipient ?? '', team: slot.winner?.team ?? null, comment: slot.winner?.comment ?? '' };
}

function withDrafts(award: AwardRow, drafts: SlotDrafts): AwardRow {
    return {
        ...award,
        winners: slotsOf(award).flatMap((slot) => {
            const draft = drafts[draftKey(award.id, slot.place)];

            if (!draft) {
                return slot.winner ? [slot.winner] : [];
            }

            return [
                {
                    id: slot.winner?.id ?? -slot.place,
                    place: slot.place,
                    recipient: draft.recipient.trim() || null,
                    comment: draft.comment.trim() || null,
                    team: draft.team,
                },
            ];
        }),
    };
}

function withoutRemovedSlots(drafts: SlotDrafts, awards: AwardRow[]): SlotDrafts {
    const kept = Object.entries(drafts).filter(([key]) => {
        const [awardId, place] = key.split(':').map(Number);

        return place <= (awards.find((award) => award.id === awardId)?.places ?? 0);
    });

    return kept.length === Object.keys(drafts).length ? drafts : Object.fromEntries(kept);
}

function SlotFields({
    award,
    slot,
    values,
    teams,
    onChange,
}: {
    award: AwardRow;
    slot: AwardSlot;
    values: SlotDraft;
    teams: AwardTeam[];
    onChange: (changes: Partial<SlotDraft>) => void;
}) {
    const label = slotLabel(slot.place);
    const fieldId = `${award.id}-${slot.place}`;

    return (
        <div className="mb-4">
            <b>{label}</b>
            <div className="-mx-3 flex flex-wrap">
                {!award.is_team_award && (
                    <div className="w-5/12 px-3">
                        <label htmlFor={`${fieldId}-name`} className={bs.formLabel}>
                            Name
                        </label>
                        <input
                            id={`${fieldId}-name`}
                            type="text"
                            className={bs.formControl}
                            maxLength={NAME_MAX_LENGTH}
                            value={values.recipient}
                            onChange={(changeEvent) => onChange({ recipient: changeEvent.target.value })}
                        />
                    </div>
                )}
                <div className={cn('px-3', award.is_team_award ? 'flex-1' : 'w-7/12')}>
                    <label htmlFor={`${fieldId}-team`} className={bs.formLabel}>
                        {award.is_team_award ? 'Team' : 'Team (optional)'}
                    </label>
                    <TeamSelect
                        id={`${fieldId}-team`}
                        label={`${label} Team`}
                        teams={teams}
                        value={values.team}
                        onChange={(team) => onChange({ team })}
                    />
                </div>
            </div>
            {slot.place === 1 && (
                <div className="mt-2">
                    <label htmlFor={`${fieldId}-comment`} className={bs.formLabel}>
                        Judges' Comments
                    </label>
                    <textarea
                        id={`${fieldId}-comment`}
                        rows={3}
                        className={bs.formControl}
                        maxLength={COMMENT_MAX_LENGTH}
                        value={values.comment}
                        onChange={(changeEvent) => onChange({ comment: changeEvent.target.value })}
                    />
                </div>
            )}
        </div>
    );
}

/**
 * FTC Live's Enter Awards page: the awards on the left, coloured by whether
 * they have been given, and the chosen award's slots on the right. Every
 * change is saved as it is made.
 */
export function EnterAwards({
    awards,
    teams,
    base,
    locked,
    save,
}: {
    awards: AwardRow[];
    teams: AwardTeam[];
    base: string;
    locked: boolean;
    save: QueueSave;
}) {
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [drafts, setDrafts] = useState<SlotDrafts>({});
    const [seenAwards, setSeenAwards] = useState(awards);

    if (seenAwards !== awards) {
        setSeenAwards(awards);
        setDrafts(withoutRemovedSlots(drafts, awards));
    }

    const entered = awards.map((award) => withDrafts(award, drafts));
    const selected = entered.find((award) => award.id === selectedId) ?? null;

    const valuesOf = (award: AwardRow, slot: AwardSlot): SlotDraft => drafts[draftKey(award.id, slot.place)] ?? draftOf(slot);

    const changeSlot = (award: AwardRow, slot: AwardSlot, changes: Partial<SlotDraft>) => {
        const draft = { ...valuesOf(award, slot), ...changes };

        setDrafts((current) => ({ ...current, [draftKey(award.id, slot.place)]: draft }));
        void save(`slot-${award.id}-${slot.place}`, 'put', `${base}/awards/${award.id}/slots/${slot.place}`, {
            team: draft.team ? Number(draft.team.number) : null,
            name: draft.recipient,
            comment: draft.comment,
        });
    };

    return (
        <div>
            <div className="-mx-3 flex flex-wrap">
                <div className="w-full px-3 sm:w-10/12">
                    <h2 className={bs.h2}>Enter Awards</h2>
                </div>
                <div className="w-full px-3 sm:w-2/12">
                    <button
                        type="button"
                        className={cn(locked ? bs.btnWarning : bs.btnPrimary, 'float-right')}
                        onClick={() => void save('lock', 'put', `${base}/awards/lock`, { locked: !locked })}
                    >
                        {locked ? 'Unsubmit Awards for Presentation' : 'Finalize Awards for Presentation'}
                    </button>
                </div>
            </div>
            <div className="-mx-3 flex flex-wrap">
                <div className="w-full px-3 lg:w-4/12">
                    <div>
                        {entered.map((award) => {
                            const variant = listVariants[isAwardGiven(award) ? 'given' : 'notGiven'];
                            const active = award.id === selectedId;

                            return (
                                <button
                                    key={award.id}
                                    type="button"
                                    aria-current={active}
                                    className={cn(listItem, active ? variant.active : variant.idle)}
                                    onClick={() => setSelectedId(award.id)}
                                >
                                    <span>{award.name}</span>
                                    <br />
                                    {awardSummary(award)}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="w-full px-3 lg:w-8/12">
                    {selected ? (
                        <div className="rounded-lg border border-black/[0.175] bg-white p-4">
                            <h5 className={bs.h5}>{selected.name}</h5>
                            <p className="mb-4 whitespace-pre-line">{selected.description}</p>
                            <div className="mb-4">
                                <b>Status</b> {isAwardGiven(selected) ? 'Already given' : 'Optional'}
                            </div>
                            {slotsOf(selected).map((slot) => (
                                <SlotFields
                                    key={slot.place}
                                    award={selected}
                                    slot={slot}
                                    values={valuesOf(selected, slot)}
                                    teams={teams}
                                    onChange={(changes) => changeSlot(selected, slot, changes)}
                                />
                            ))}
                            <div className="mb-4">
                                <button
                                    type="button"
                                    className={`${bs.btnSecondary} mr-2`}
                                    onClick={() => void save(oneOffSaveKey(), 'post', `${base}/awards/${selected.id}/slots`)}
                                >
                                    Add slot
                                </button>
                                <button
                                    type="button"
                                    className={bs.btnSecondary}
                                    onClick={() => void save(oneOffSaveKey(), 'delete', `${base}/awards/${selected.id}/slots`)}
                                >
                                    Remove slot
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>Select an award to edit</div>
                    )}
                </div>
            </div>
        </div>
    );
}
