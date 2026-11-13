import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { oneOffSaveKey, type QueueSave } from '@/hooks/use-save-queue';
import { type AwardRow } from '@/lib/award-utils';
import { bs } from '@/lib/bootstrap';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useState } from 'react';

interface AwardDetails {
    name: string;
    description: string;
    is_team_award: boolean;
}

const NAME_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 5000;
const NEW_AWARD: AwardDetails = { name: '', description: '', is_team_award: false };
const CHECK_MARK =
    "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3e%3cpath fill='none' stroke='%23fff' stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='m6 10 3 3 6-6'/%3e%3c/svg%3e\")";

function detailsOf(award: AwardRow): AwardDetails {
    return { name: award.name, description: award.description ?? '', is_team_award: award.is_team_award };
}

function DeleteAwardDialog({ award, onDelete, onClose }: { award: AwardRow; onDelete: () => void; onClose: () => void }) {
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="top-7 translate-y-0 gap-0 rounded-lg border-black/20 bg-white p-0 text-base text-[#212529] sm:max-w-[500px]">
                <div className="border-b border-[#dee2e6] p-4">
                    <DialogTitle className="text-xl leading-normal font-medium">Delete Award?</DialogTitle>
                </div>
                <DialogDescription className="p-4 text-base text-[#212529]">
                    Are you sure you want to delete the "{award.name}" award? This cannot be undone.
                </DialogDescription>
                <div className="flex justify-end gap-2 border-t border-[#dee2e6] p-3">
                    <button type="button" className={bs.btnSecondary} onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={bs.btnDanger}
                        onClick={() => {
                            onDelete();
                            onClose();
                        }}
                    >
                        Delete
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function AwardCard({
    award,
    base,
    save,
    onMoveUp,
    onMoveDown,
    onClose,
}: {
    award?: AwardRow;
    base: string;
    save: QueueSave;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onClose?: () => void;
}) {
    const [draft, setDraft] = useState<AwardDetails | null>(award ? null : NEW_AWARD);
    const [deleting, setDeleting] = useState(false);
    const editing = draft !== null;
    const details = draft ?? (award ? detailsOf(award) : NEW_AWARD);
    const checkboxId = `award-${award?.id ?? 'creatingNew'}-isTeamAward`;

    const change = (changes: Partial<AwardDetails>) => setDraft({ ...details, ...changes });

    const saveDetails = async () => {
        const saved = await (award
            ? save(oneOffSaveKey(), 'put', `${base}/awards/${award.id}`, { ...details })
            : save(oneOffSaveKey(), 'post', `${base}/awards`, { ...details }));

        if (saved) {
            setDraft(null);
            onClose?.();
        }
    };

    return (
        <div className="mb-2 rounded-lg border border-black/[0.175] bg-white">
            <div className="flex items-center justify-between rounded-t-lg border-b border-black/[0.175] bg-[rgba(33,37,41,0.03)] px-4 py-2">
                {editing ? (
                    <input
                        type="text"
                        aria-label="Award Name"
                        className={`${bs.formControl} !w-auto`}
                        maxLength={NAME_MAX_LENGTH}
                        value={details.name}
                        onChange={(changeEvent) => change({ name: changeEvent.target.value })}
                    />
                ) : (
                    <span>{details.name}</span>
                )}
                <div className="flex items-center">
                    <div className="mr-4 flex items-center">
                        <input
                            id={checkboxId}
                            type="checkbox"
                            className="size-4 appearance-none rounded border border-[#dee2e6] bg-white bg-contain bg-center bg-no-repeat checked:border-[#0d6efd] checked:bg-[#0d6efd] focus:border-[#86b7fe] focus:shadow-[0_0_0_0.25rem_rgba(13,110,253,0.25)] focus:outline-none disabled:opacity-50"
                            style={details.is_team_award ? { backgroundImage: CHECK_MARK } : undefined}
                            checked={details.is_team_award}
                            disabled={!editing}
                            onChange={(changeEvent) => change({ is_team_award: changeEvent.target.checked })}
                        />
                        <label htmlFor={checkboxId} className={cn('ml-2', !editing && 'opacity-50')}>
                            Team Award?
                        </label>
                    </div>
                    {editing ? (
                        <>
                            <button
                                type="button"
                                className={bs.btnSecondary}
                                onClick={() => {
                                    setDraft(null);
                                    onClose?.();
                                }}
                            >
                                Cancel
                            </button>
                            <button type="button" className={`${bs.btnPrimary} ml-2`} onClick={() => void saveDetails()}>
                                Save
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" className={bs.btnPrimary} onClick={() => setDraft(details)}>
                                Edit
                            </button>
                            <button type="button" className={`${bs.btnDanger} ml-2`} onClick={() => setDeleting(true)}>
                                Delete
                            </button>
                        </>
                    )}
                    {(onMoveUp || onMoveDown) && (
                        <>
                            <button
                                type="button"
                                aria-label={`Move ${details.name} up`}
                                className={`${bs.btnSecondary} ml-2`}
                                disabled={!onMoveUp}
                                onClick={onMoveUp}
                            >
                                <ArrowUp className="inline size-4 align-[-0.125em]" strokeWidth={3} />
                            </button>
                            <button
                                type="button"
                                aria-label={`Move ${details.name} down`}
                                className={`${bs.btnSecondary} ml-1`}
                                disabled={!onMoveDown}
                                onClick={onMoveDown}
                            >
                                <ArrowDown className="inline size-4 align-[-0.125em]" strokeWidth={3} />
                            </button>
                        </>
                    )}
                </div>
            </div>
            <div className="p-4">
                <textarea
                    rows={4}
                    aria-label="Award Description"
                    className={bs.formControl}
                    maxLength={DESCRIPTION_MAX_LENGTH}
                    readOnly={!editing}
                    value={details.description}
                    onChange={(changeEvent) => change({ description: changeEvent.target.value })}
                />
            </div>
            {deleting && award && (
                <DeleteAwardDialog
                    award={award}
                    onDelete={() => void save(oneOffSaveKey(), 'delete', `${base}/awards/${award.id}`)}
                    onClose={() => setDeleting(false)}
                />
            )}
        </div>
    );
}

/**
 * FTC Live's Manage Awards page: every award is a card that is renamed,
 * described and marked as a team award in place, and the arrows change the
 * order the awards are presented in.
 */
export function ManageAwards({ awards, base, save }: { awards: AwardRow[]; base: string; save: QueueSave }) {
    const [creating, setCreating] = useState(false);
    const swap = (first: AwardRow, second: AwardRow) => () =>
        void save(oneOffSaveKey(), 'post', `${base}/awards/swap`, { first: first.id, second: second.id });

    return (
        <div>
            <h2 className={bs.h2}>Manage Awards</h2>
            Presented in order listed. Only custom awards can be reordered.
            <br />
            {creating ? (
                <AwardCard base={base} save={save} onClose={() => setCreating(false)} />
            ) : (
                <button type="button" className={`${bs.btnPrimary} mb-4`} onClick={() => setCreating(true)}>
                    Create New Award
                </button>
            )}
            {awards.map((award, index) => (
                <AwardCard
                    key={award.id}
                    award={award}
                    base={base}
                    save={save}
                    onMoveUp={index > 0 ? swap(awards[index - 1], award) : undefined}
                    onMoveDown={index < awards.length - 1 ? swap(award, awards[index + 1]) : undefined}
                />
            ))}
        </div>
    );
}
