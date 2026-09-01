import { Volume2 } from 'lucide-react';

/**
 * Autoplay is blocked until the page gets a real click/tap/keypress -- a
 * display page normally has nothing to click, so sound silently never plays
 * until someone does this once. Render conditionally on `useAudioEngine()`'s
 * `unlocked` flag; it dismisses itself the instant that flips true.
 */
export function AudioUnlockPrompt() {
    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/80 text-center backdrop-blur-sm">
            <Volume2 className="h-10 w-10 animate-pulse text-white/80" />
            <div className="max-w-md px-6">
                <p className="text-lg font-semibold text-white">This display is set to play sounds but currently cannot</p>
                <p className="mt-1 text-sm text-white/60">Click anywhere to enable audio for match sound cues.</p>
            </div>
        </div>
    );
}
