import { DisplaySettingsDialog } from '@/components/display/display-settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useApi } from '@/hooks/use-api';
import { useFieldCount } from '@/hooks/use-field-count';
import { type DisplayConfig, displayTypeOption } from '@/lib/display-config';
import { cn } from '@/lib/utils';
import { type AudienceDisplayState, type ConnectedDisplay, type DisplayModeValue } from '@/types';
import { router } from '@inertiajs/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MonitorOff, RotateCw } from 'lucide-react';
import { type ReactNode, useState } from 'react';

const SHOW_GROUPS: { title: string; buttons: { mode: DisplayModeValue; label: string }[] }[] = [
    {
        title: 'General Information',
        buttons: [
            { mode: 'blank', label: 'Show Event Name' },
            { mode: 'sponsors', label: 'Show Sponsors' },
        ],
    },
    {
        title: 'Playoff',
        buttons: [
            { mode: 'bracket', label: 'Show Bracket' },
            { mode: 'alliance_selection', label: 'Show Alliance Selection' },
        ],
    },
    { title: 'Other Displays', buttons: [{ mode: 'rankings', label: 'Show Ranks' }] },
];

const greenButtonClass = 'rounded-md border border-[#198754] bg-[#198754] px-3 py-1.5 text-white hover:bg-[#157347] disabled:opacity-65';

function Group({ title, children }: { title: string; children: ReactNode }) {
    return (
        <fieldset className="mx-0.5 mb-2 border border-white/60 px-3 pt-1 pb-3">
            <legend className="px-0.5">{title}</legend>
            {children}
        </fieldset>
    );
}

function ShowButtons({ display, onShow }: { display: AudienceDisplayState | undefined; onShow: (mode: DisplayModeValue, message?: string) => void }) {
    return (
        <>
            {SHOW_GROUPS.map((group) => (
                <Group key={group.title} title={group.title}>
                    <div className="flex flex-wrap gap-2">
                        {group.buttons.map((button) => (
                            <button
                                key={button.mode}
                                type="button"
                                className={cn(greenButtonClass, display?.mode === button.mode && 'ring-2 ring-white')}
                                onClick={() => onShow(button.mode)}
                            >
                                {button.label}
                            </button>
                        ))}
                    </div>
                </Group>
            ))}
        </>
    );
}

function MessageGroup({
    display,
    onShow,
}: {
    display: AudienceDisplayState | undefined;
    onShow: (mode: DisplayModeValue, message?: string) => void;
}) {
    const [message, setMessage] = useState(display?.message ?? '');
    const showing = display?.mode === 'message';

    return (
        <Group title="Message">
            <textarea
                aria-label="Message"
                value={message}
                maxLength={2000}
                rows={5}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={'Lunch break\nMatches resume at 1:00 PM'}
                className="mb-2 w-full border border-[#ccc] bg-white px-3 py-2 text-black outline-none placeholder:text-gray-500"
            />
            <div className="flex items-center gap-3">
                <button type="button" className={greenButtonClass} disabled={message.trim() === ''} onClick={() => onShow('message', message.trim())}>
                    {showing ? 'Update Message' : 'Show Message'}
                </button>
                {showing && <span>Showing on the audience displays.</span>}
            </div>
        </Group>
    );
}

function describeField(config: DisplayConfig): string {
    if (!displayTypeOption(config.type).canFlip) {
        return '—';
    }

    return config.field ? `Field ${config.field}` : 'All';
}

function ReloadScreensButton() {
    const [confirming, setConfirming] = useState(false);
    const [sending, setSending] = useState(false);

    if (!confirming) {
        return (
            <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
                <RotateCw className="mr-1 size-4" /> Reload all screens
            </Button>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Every display and tablet reloads; tablets wait for unsaved taps.</span>
            <Button
                size="sm"
                variant="destructive"
                disabled={sending}
                onClick={() => {
                    setSending(true);
                    router.post('/screens/reload', {}, { preserveScroll: true, onFinish: () => setSending(false) });
                }}
            >
                Reload now
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
            </Button>
        </div>
    );
}

function ConnectedDisplays() {
    const api = useApi();
    const queryClient = useQueryClient();
    const fieldCount = useFieldCount();
    const { data: displays = [], isLoading } = useQuery<ConnectedDisplay[]>({
        queryKey: ['connected-displays'],
        queryFn: api.getConnectedDisplays,
        refetchInterval: 5000,
    });
    const [editing, setEditing] = useState<ConnectedDisplay | null>(null);
    const [checked, setChecked] = useState<string[]>([]);
    const [bulkField, setBulkField] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const configure = async (displayIds: string[], changes: Partial<DisplayConfig>) => {
        setSaving(true);
        try {
            queryClient.setQueryData(['connected-displays'], await api.configureDisplays(displayIds, changes));
        } finally {
            setSaving(false);
        }
    };

    const selectedIds = checked.filter((id) => displays.some((display) => display.id === id));

    return (
        <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
                <div className="space-y-1.5">
                    <CardTitle>Connected displays</CardTitle>
                    <CardDescription>Every display screen that is open right now. Change one here and it switches straight away.</CardDescription>
                </div>
                <ReloadScreensButton />
            </CardHeader>
            <CardContent className="space-y-3">
                {displays.length === 0 ? (
                    <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
                        <MonitorOff className="size-5" />
                        {isLoading ? 'Looking for displays…' : 'No displays are open. Open the Display page on a screen and it appears here.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-muted-foreground text-left text-xs uppercase">
                                <tr className="border-b">
                                    <th className="w-8 py-2" />
                                    <th className="py-2 pr-3 font-medium">Name</th>
                                    <th className="py-2 pr-3 font-medium">IP</th>
                                    <th className="py-2 pr-3 font-medium">Type</th>
                                    <th className="py-2 pr-3 font-medium">Field</th>
                                    <th className="py-2 pr-3 font-medium">Audio</th>
                                    <th className="py-2 pr-3 font-medium">Sides</th>
                                    <th className="py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {displays.map((display) => {
                                    const option = displayTypeOption(display.config.type);

                                    return (
                                        <tr key={display.id} className="border-b last:border-0">
                                            <td className="py-2">
                                                <Checkbox
                                                    aria-label={`Select ${display.config.name ?? display.ip ?? 'display'}`}
                                                    checked={selectedIds.includes(display.id)}
                                                    onCheckedChange={(value) =>
                                                        setChecked(
                                                            value === true
                                                                ? [...selectedIds, display.id]
                                                                : selectedIds.filter((id) => id !== display.id),
                                                        )
                                                    }
                                                />
                                            </td>
                                            <td className="py-2 pr-3 font-medium">
                                                {display.config.name ?? <span className="text-muted-foreground">Unnamed</span>}
                                            </td>
                                            <td className="text-muted-foreground py-2 pr-3 tabular-nums">{display.ip ?? '—'}</td>
                                            <td className="py-2 pr-3">{option.label}</td>
                                            <td className="py-2 pr-3">{describeField(display.config)}</td>
                                            <td className="py-2 pr-3">{option.playsSound ? (display.config.mute ? 'Off' : 'On') : '—'}</td>
                                            <td className="py-2 pr-3">
                                                {option.canFlip ? (display.config.flipped ? 'Blue on left' : 'Red on left') : '—'}
                                            </td>
                                            <td className="py-2 text-right">
                                                <Button size="sm" variant="outline" onClick={() => setEditing(display)}>
                                                    Config
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {fieldCount > 1 && displays.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                        <Label htmlFor="bulk-field" className="text-sm">
                            Bind {selectedIds.length || 'selected'} {selectedIds.length === 1 ? 'display' : 'displays'} to
                        </Label>
                        <select
                            id="bulk-field"
                            value={bulkField ?? ''}
                            onChange={(event) => setBulkField(event.target.value ? Number(event.target.value) : null)}
                            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                        >
                            <option value="">All fields</option>
                            {Array.from({ length: fieldCount }, (_, index) => (
                                <option key={index + 1} value={index + 1}>
                                    Field {index + 1}
                                </option>
                            ))}
                        </select>
                        <Button
                            size="sm"
                            disabled={selectedIds.length === 0 || saving}
                            onClick={() => configure(selectedIds, { field: bulkField }).then(() => setChecked([]))}
                        >
                            Update displays
                        </Button>
                    </div>
                )}
            </CardContent>

            {editing && (
                <DisplaySettingsDialog
                    open
                    onOpenChange={(open) => !open && setEditing(null)}
                    config={editing.config}
                    description={`Changes apply to ${editing.config.name ?? 'this screen'} straight away.`}
                    saveLabel="Update display"
                    onSave={(config) => configure([editing.id], config).then(() => setEditing(null))}
                />
            )}
        </Card>
    );
}

/**
 * Match control's display tab, like FTC Live's "Video Switch": buttons for
 * what the audience displays show, a message screen, and every open display
 * screen with its settings.
 */
export function DisplaySwitch({
    display,
    onShow,
}: {
    display: AudienceDisplayState | undefined;
    onShow: (mode: DisplayModeValue, message?: string) => void;
}) {
    return (
        <div>
            <ShowButtons display={display} onShow={onShow} />
            <MessageGroup display={display} onShow={onShow} />
            <Group title="Displays">
                <div className="text-foreground">
                    <ConnectedDisplays />
                </div>
            </Group>
        </div>
    );
}
