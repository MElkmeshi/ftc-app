import { bs } from '@/lib/bootstrap';
import { Check, LoaderCircle, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

const SAVED_DELAY_MS = 500;

/**
 * The note in the corner of FTC Live's awards pages that says whether every
 * edit has reached the server. It keeps saying "Saving..." for a moment
 * after the last save, so it doesn't flicker while typing.
 */
export function SavingIndicator({ pending, failed }: { pending: number; failed: boolean }) {
    const [lingering, setLingering] = useState(false);
    const saving = pending > 0 || lingering;

    useEffect(() => {
        if (pending > 0) {
            setLingering(true);

            return;
        }

        const timer = setTimeout(() => setLingering(false), SAVED_DELAY_MS);

        return () => clearTimeout(timer);
    }, [pending]);

    return (
        <div role="status" className="fixed right-0 bottom-0 z-[1000] w-[12em] p-[10px] text-center print:hidden">
            {saving ? (
                <div className={bs.alertInfo}>
                    <LoaderCircle className="inline size-4 animate-spin align-[-0.125em]" /> Saving...
                </div>
            ) : failed ? (
                <div className={bs.alertDanger}>
                    <TriangleAlert className="inline size-4 align-[-0.125em]" /> Edits not saved
                </div>
            ) : (
                <div className={bs.alertSuccess}>
                    <Check className="inline size-4 align-[-0.125em]" strokeWidth={3} /> All edits saved
                </div>
            )}
        </div>
    );
}
