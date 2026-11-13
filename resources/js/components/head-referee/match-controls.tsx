import { useApi } from '@/hooks/use-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { bs } from '@/lib/bootstrap';
import { getMatchTitle } from '@/lib/match-utils';
import { type CompetitionMatch, type MatchControlSettings } from '@/types';
import { router } from '@inertiajs/react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * Match control from the head referee page, as far as Match Control's
 * "External Match Control" setting allows: starting the loaded match, or
 * also loading, aborting and committing.
 */
export function MatchControls({
    control,
    loaded,
    running,
    next,
}: {
    control: MatchControlSettings['hr_control'];
    loaded: CompetitionMatch | null;
    running: CompetitionMatch | null;
    next: CompetitionMatch | null;
}) {
    const api = useApi();
    const queryClient = useQueryClient();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (control === 'none') {
        return null;
    }

    const run = (action: () => Promise<unknown>) => {
        setBusy(true);
        setError(null);
        action()
            .then(() => {
                router.reload({ only: ['matches'] });
                void queryClient.invalidateQueries({ queryKey: ['loaded-match'] });
            })
            .catch((e) => setError(getApiErrorMessage(e)))
            .finally(() => setBusy(false));
    };

    return (
        <div className="my-3 rounded-md border border-[#dee2e6] p-2 text-center">
            <div className="flex flex-wrap justify-center gap-2">
                {control === 'full' && (
                    <button
                        type="button"
                        className={bs.btnSuccess}
                        disabled={busy || !next || loaded !== null || running !== null}
                        onClick={() => next && run(() => api.loadMatch(next.id))}
                    >
                        Load Next Match
                    </button>
                )}
                {running === null && (
                    <button
                        type="button"
                        className={bs.btnDanger}
                        disabled={busy || !loaded}
                        onClick={() => loaded && run(() => api.startMatch(loaded.id))}
                    >
                        Start Match{loaded ? ` (${getMatchTitle(loaded)})` : ''}
                    </button>
                )}
                {control === 'full' && running !== null && (
                    <>
                        <button
                            type="button"
                            className={bs.btnDanger}
                            disabled={busy}
                            onClick={() => confirm(`Abort ${getMatchTitle(running)}?`) && run(() => api.cancelMatch(running.id))}
                        >
                            Abort Match
                        </button>
                        <button type="button" className={bs.btnSuccess} disabled={busy} onClick={() => run(() => api.endMatch(running.id))}>
                            Commit Match
                        </button>
                    </>
                )}
            </div>
            {error && <p className="mt-2 rounded bg-[#f8d7da] px-3 py-1 text-[#842029]">{error}</p>}
        </div>
    );
}
