/**
 * Browsers block sound until the page gets a real click, tap or key press,
 * and a display normally has nothing to click. Laid out like FTC Live's
 * warning: a box in the middle of the screen, over the display without
 * hiding it, which goes away as soon as anyone clicks anywhere.
 * Muting the display hides it too.
 */
export function AudioUnlockPrompt() {
    return (
        <div
            role="alert"
            className="fixed top-1/2 left-1/2 z-50 w-[min(700px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-[5px] border-yellow-400 bg-black p-4 text-center text-2xl text-white shadow-2xl"
        >
            <h3 className="mb-2 text-3xl font-bold text-yellow-400">Audio Warning</h3>
            <p>
                This display is set to play sounds but currently cannot.
                <br />
                Click anywhere to unmute.
            </p>
            <button type="button" className="mt-3 rounded-md bg-white px-4 py-1.5 text-xl font-medium text-black hover:bg-white/90">
                Unmute
            </button>
        </div>
    );
}
