import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isLocalOnlyAddress } from '@/hooks/use-server-address';
import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';

export function ServerAddressField({ address, onChange, onReset }: { address: string; onChange: (address: string) => void; onReset: () => void }) {
    const [draft, setDraft] = useState(address);
    const localOnly = isLocalOnlyAddress(address);

    return (
        <div className="space-y-2">
            <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(submitEvent) => {
                    submitEvent.preventDefault();
                    onChange(draft);
                }}
            >
                <label htmlFor="server-address" className="text-sm font-medium">
                    Server address for phones
                </label>
                <Input id="server-address" className="w-64 font-mono" value={draft} onChange={(changeEvent) => setDraft(changeEvent.target.value)} />
                <Button type="submit" size="sm" variant="outline" disabled={draft.trim() === '' || draft === address}>
                    Use
                </Button>
                {address !== window.location.origin && (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                            onReset();
                            setDraft(window.location.origin);
                        }}
                    >
                        Reset
                    </Button>
                )}
            </form>
            {localOnly && (
                <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    Phones can't open {address}. Enter this computer's network address instead, such as http://192.168.1.20:8090 (find it in your
                    network settings).
                </p>
            )}
        </div>
    );
}
