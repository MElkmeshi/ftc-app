import { VolumeX } from 'lucide-react';

/**
 * Browsers block sound until the page gets a real click, tap or key press,
 * and a display normally has nothing to click. FTC Live shows the same
 * warning. It sits in a corner so the screen stays readable, and it goes
 * away by itself as soon as anyone clicks; muting the display hides it too.
 */
export function AudioUnlockPrompt() {
    return (
        <div
            role="alert"
            className="fixed right-4 bottom-4 z-50 flex max-w-sm items-start gap-3 rounded-xl bg-amber-400 p-4 text-slate-950 shadow-2xl"
        >
            <VolumeX className="mt-0.5 size-6 shrink-0" />
            <div>
                <p className="font-bold">Audio warning</p>
                <p className="text-sm">This display is set to play sounds but currently cannot. Click anywhere to unmute.</p>
            </div>
        </div>
    );
}
