import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DISPLAY_TYPES, type DisplayConfig, displayTypeOption } from '@/lib/display-config';
import { cn } from '@/lib/utils';
import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';

const CURSOR_IDLE_MS = 3000;

/** True for a few seconds after the mouse moves, so controls stay hidden on an unattended screen. */
function useCursorMovedRecently(): boolean {
    const [moved, setMoved] = useState(false);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout> | undefined;

        const onMove = () => {
            setMoved(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setMoved(false), CURSOR_IDLE_MS);
        };

        window.addEventListener('mousemove', onMove);

        return () => {
            window.removeEventListener('mousemove', onMove);
            clearTimeout(timeout);
        };
    }, []);

    return moved;
}

/**
 * The gear in the corner of every display. It appears when someone moves the
 * mouse and lets that one screen choose what it shows, like FTC Live's
 * display configuration.
 */
export function DisplaySettings({
    config,
    onChange,
    defaultOpen,
}: {
    config: DisplayConfig;
    onChange: (config: DisplayConfig) => void;
    defaultOpen: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const [draft, setDraft] = useState(config);
    const cursorMoved = useCursorMovedRecently();
    const option = displayTypeOption(draft.type);

    const openSettings = () => {
        setDraft(config);
        setOpen(true);
    };

    const save = () => {
        onChange(draft);
        setOpen(false);
    };

    return (
        <>
            <button
                type="button"
                aria-label="Display settings"
                onClick={openSettings}
                className={cn(
                    'fixed top-4 right-4 z-50 rounded-full bg-black/60 p-3 text-white shadow-lg transition-opacity duration-300 hover:bg-black/80',
                    cursorMoved && !open ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
            >
                <Settings className="size-6" />
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Display settings</DialogTitle>
                        <DialogDescription>Choose what this screen shows. Each screen at the venue keeps its own choice.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2" role="radiogroup" aria-label="Display type">
                        {DISPLAY_TYPES.map((type) => (
                            <button
                                key={type.value}
                                type="button"
                                role="radio"
                                aria-checked={draft.type === type.value}
                                onClick={() => setDraft({ ...draft, type: type.value })}
                                className={cn(
                                    'rounded-lg border-2 p-3 text-left transition',
                                    draft.type === type.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                                )}
                            >
                                <div className="font-medium">{type.label}</div>
                                <p className="text-muted-foreground mt-0.5 text-sm">{type.description}</p>
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-3">
                        {option.playsSound && (
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="display-mute"
                                    checked={draft.mute}
                                    onCheckedChange={(checked) => setDraft({ ...draft, mute: checked === true })}
                                />
                                <Label htmlFor="display-mute">Mute match sounds on this screen</Label>
                            </div>
                        )}
                        {option.canFlip && (
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="display-flipped"
                                    checked={draft.flipped}
                                    onCheckedChange={(checked) => setDraft({ ...draft, flipped: checked === true })}
                                />
                                <Label htmlFor="display-flipped">Swap sides (blue alliance on the left)</Label>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button onClick={save}>Show on this screen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
