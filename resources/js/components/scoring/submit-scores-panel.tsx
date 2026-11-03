import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-error';
import { type ScoreSubmission } from '@/types';
import { CheckCircle, LockOpen, TriangleAlert } from 'lucide-react';

/**
 * The referee's last step, like FTC Live: submit this alliance's scores,
 * which locks them and tells the head referee they are final. Reopening
 * unlocks them while the match is still open.
 */
export function SubmitScoresPanel({
    matchNumber,
    allianceName,
    submission,
    pending,
    error,
    onChange,
}: {
    matchNumber: number;
    allianceName: string;
    submission: ScoreSubmission | null;
    pending: boolean;
    error?: unknown;
    onChange: (submitted: boolean) => void;
}) {
    const message = getApiErrorMessage(error);

    if (submission) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-emerald-500/50 bg-emerald-50 p-4 dark:bg-emerald-950/30">
                <div>
                    <p className="flex items-center gap-2 font-bold">
                        <CheckCircle className="size-5 text-emerald-600" /> {allianceName} scores submitted
                    </p>
                    <p className="text-muted-foreground text-sm">
                        By {submission.by} at {new Date(submission.at).toLocaleTimeString()}. Waiting for the head referee to commit Match #
                        {matchNumber}.
                    </p>
                    {message && <p className="text-destructive text-sm">{message}</p>}
                </div>
                <Button variant="outline" onClick={() => onChange(false)} disabled={pending}>
                    <LockOpen className="mr-2 size-4" /> Reopen to edit
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-amber-500/50 bg-amber-50 p-4 dark:bg-amber-950/30">
            <div>
                <p className="font-bold">
                    Submit {allianceName} scores · Match #{matchNumber}
                </p>
                <p className="text-muted-foreground text-sm">Locks these scores and tells the head referee they are final.</p>
                {message && <p className="text-destructive text-sm">{message}</p>}
            </div>
            <Button onClick={() => onChange(true)} disabled={pending} className="bg-amber-600 text-white hover:bg-amber-500">
                <CheckCircle className="mr-2 size-4" />
                {pending ? 'Submitting…' : 'Submit'}
            </Button>
        </div>
    );
}

/** Shown when another tablet is scoring the same alliance, since their counts would overwrite each other. */
export function SeatWarning({ names, allianceName }: { names: string[]; allianceName: string }) {
    if (names.length === 0) {
        return null;
    }

    return (
        <div
            role="alert"
            className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-xl items-start gap-3 rounded-xl border-2 border-red-500 bg-red-50 p-4 text-red-900 shadow-lg dark:bg-red-950 dark:text-red-100"
        >
            <TriangleAlert className="mt-0.5 size-5 shrink-0" />
            <div>
                <p className="font-bold">Another tablet is also scoring {allianceName}</p>
                <p className="text-sm">
                    {names.join(', ')} {names.length === 1 ? 'is' : 'are'} on the same alliance. Only one tablet should score each alliance, or the
                    counts will overwrite each other.
                </p>
            </div>
        </div>
    );
}
