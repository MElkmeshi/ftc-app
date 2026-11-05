import { DisplaySettingsDialog } from '@/components/display/display-settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useApi } from '@/hooks/use-api';
import { useFieldCount } from '@/hooks/use-field-count';
import { type DisplayConfig, displayTypeOption } from '@/lib/display-config';
import { type AudienceDisplayState, type ConnectedDisplay, type DisplayModeValue } from '@/types';
import { router } from '@inertiajs/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MonitorOff, RotateCw } from 'lucide-react';
import { useState } from 'react';

const SHOW_GROUPS: { title: string; buttons: { mode: DisplayModeValue; label: string }[] }[] = [
    { title: 'General', buttons: [{ mode: 'blank', label: 'Show event name' }] },
    {
        title: 'Playoff',
        buttons: [
            { mode: 'bracket', label: 'Show bracket' },
            { mode: 'alliance_selection', label: 'Show alliance selection' },
        ],
    },
    { title: 'Other displays', buttons: [{ mode: 'rankings', label: 'Show rankings' }] },
];

function ShowButtons({ display, onShow }: { display: AudienceDisplayState | undefined; onShow: (mode: DisplayModeValue, message?: string) => void }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Show on audience displays</CardTitle>
                <CardDescription>Every screen set to Audience switches at once.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
                {SHOW_GROUPS.map((group) => (
                    <fieldset key={group.title} className="space-y-2">
                        <legend className="text-muted-foreground mb-2 text-xs font-medium uppercase">{group.title}</legend>
                        {group.buttons.map((button) => (
                            <Button
                                key={button.mode}
                                className="w-full justify-start"
                                variant={display?.mode === button.mode ? 'default' : 'outline'}
                                onClick={() => onShow(button.mode)}
                            >
                                {button.label}
                            </Button>
                        ))}
                    </fieldset>
                ))}
            </CardContent>
        </Card>
    );
}

function MessageCard({ display, onShow }: { display: AudienceDisplayState | undefined; onShow: (mode: DisplayModeValue, message?: string) => void }) {
    const [message, setMessage] = useState(display?.message ?? '');
    const showing = display?.mode === 'message';

    return (
        <Card>
            <CardHeader>
                <CardTitle>Message</CardTitle>
                <CardDescription>Put an announcement on the audience displays, e.g. a break or a schedule change.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <textarea
                    aria-label="Message"
                    value={message}
                    maxLength={2000}
                    rows={4}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={'Lunch break\nMatches resume at 1:00 PM'}
                    className="border-input bg-background focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                />
                <div className="flex items-center gap-3">
                    <Button disabled={message.trim() === ''} onClick={() => onShow('message', message.trim())}>
                        {showing ? 'Update message' : 'Show message'}
                    </Button>
                    {showing && <span className="text-sm text-emerald-600">Showing on the audience displays.</span>}
                </div>
            </CardContent>
        </Card>
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
        <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-4">
                <ShowButtons display={display} onShow={onShow} />
                <MessageCard display={display} onShow={onShow} />
            </div>
            <ConnectedDisplays />
        </div>
    );
}
