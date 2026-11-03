import { Button } from '@/components/ui/button';
import { removeGameImage, uploadGameImage } from '@/lib/game-images';
import { ImageUp, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

const ACCEPT = '.png,.jpg,.jpeg,.webp,.svg';

/**
 * A preview of one of the game's pictures with buttons to replace or remove
 * it. SVGs are checked on the server and rejected if they contain scripts.
 */
export function ImageUploadField({
    label,
    imageUrl,
    uploadUrl,
    onChange,
    previewClassName = 'size-10',
}: {
    label: string;
    imageUrl: string | null | undefined;
    uploadUrl: string;
    onChange: () => void;
    previewClassName?: string;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const run = async (action: () => Promise<unknown>) => {
        setBusy(true);
        setError(null);

        try {
            await action();
            onChange();
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'The picture could not be saved.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <div className={`bg-muted/50 flex shrink-0 items-center justify-center overflow-hidden rounded-md border ${previewClassName}`}>
                    {imageUrl ? (
                        <img src={imageUrl} alt={label} className="size-full object-contain" />
                    ) : (
                        <ImageUp className="text-muted-foreground size-4" />
                    )}
                </div>
                <input
                    ref={input}
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    aria-label={label}
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';

                        if (file) {
                            void run(() => uploadGameImage(uploadUrl, file));
                        }
                    }}
                />
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
                    {imageUrl ? 'Replace' : 'Upload'}
                </Button>
                {imageUrl && (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void run(() => removeGameImage(uploadUrl))}
                        aria-label={`Remove ${label}`}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                )}
            </div>
            {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
    );
}
