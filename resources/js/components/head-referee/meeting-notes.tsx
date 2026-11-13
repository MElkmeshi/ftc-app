import { useHeadRefereeDesk } from '@/hooks/use-head-referee-desk';
import { bs } from '@/lib/bootstrap';
import { cn } from '@/lib/utils';
import { type MeetingType } from '@/types';
import { useState } from 'react';

const MEETINGS: { type: MeetingType; label: string }[] = [
    { type: 'referee', label: 'Referee Rules' },
    { type: 'logistics', label: 'Scoring & Referee Logistics' },
    { type: 'driver', label: "Drivers'" },
    { type: 'captain', label: "Alliance Captains'" },
    { type: 'other', label: 'Other' },
];

export function MeetingNotes() {
    const { meetingNotes, saveMeetingNotes, savingMeetingNotes } = useHeadRefereeDesk();
    const [type, setType] = useState<MeetingType>('referee');
    const [draft, setDraft] = useState<string | null>(null);
    const label = MEETINGS.find((meeting) => meeting.type === type)?.label;
    const saved = meetingNotes[type] ?? '';

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <label htmlFor="meeting-type">Meeting:</label>
                <select
                    id="meeting-type"
                    className={cn(bs.formSelect, 'w-auto')}
                    value={type}
                    disabled={draft !== null}
                    onChange={(e) => setType(e.target.value as MeetingType)}
                >
                    {MEETINGS.map((meeting) => (
                        <option key={meeting.type} value={meeting.type}>
                            {meeting.label}
                        </option>
                    ))}
                </select>
            </div>
            <h4 className={cn(bs.h4, 'text-center')}>{label} Meeting Notes</h4>
            {draft === null ? (
                <div className="min-h-24 rounded-md border border-[#dee2e6] p-3 whitespace-pre-wrap">
                    {saved || <span className="text-[#6c757d]">No notes yet.</span>}
                </div>
            ) : (
                <textarea className={bs.formControl} rows={10} autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} />
            )}
            <div className="mt-2 flex justify-end gap-2">
                {draft === null ? (
                    <button type="button" className={bs.btnPrimary} onClick={() => setDraft(saved)}>
                        Edit
                    </button>
                ) : (
                    <>
                        <button type="button" className={bs.btnSecondary} onClick={() => setDraft(null)}>
                            Discard
                        </button>
                        <button
                            type="button"
                            className={bs.btnPrimary}
                            disabled={savingMeetingNotes}
                            onClick={() => saveMeetingNotes({ type, text: draft }).then(() => setDraft(null))}
                        >
                            Save
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
