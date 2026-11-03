import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type EventTypeOption, type EventTypeValue } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Info } from 'lucide-react';
import { type FormEventHandler } from 'react';

interface CreateEventProps {
    eventTypes: EventTypeOption[];
    existingEvents: { code: string; name: string }[];
    defaultTimezone: string;
    [key: string]: unknown;
}

interface EventForm {
    code: string;
    name: string;
    type: EventTypeValue;
    venue: string;
    timezone: string;
    start_date: string;
    end_date: string;
    field_count: number;
    copy_game_from: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Events', href: '/events' },
    { title: 'New event', href: '/events/create' },
];

const selectClassName =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm';

/** Suggests an event code from its name: "Tripoli Spring Scrimmage" → "tripoli_spring_scrimmage". */
function suggestCode(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 32);
}

export default function CreateEvent() {
    const { eventTypes, existingEvents, defaultTimezone } = usePage<CreateEventProps>().props;
    const today = new Date().toISOString().slice(0, 10);
    const timezones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [defaultTimezone];

    const { data, setData, post, errors, processing } = useForm<EventForm>({
        code: '',
        name: '',
        type: 'scrimmage',
        venue: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || defaultTimezone,
        start_date: today,
        end_date: today,
        field_count: 1,
        copy_game_from: existingEvents[0]?.code ?? '',
    });
    const codeWasEdited = data.code !== '' && data.code !== suggestCode(data.name);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/events');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New event" />

            <div className="mx-auto w-full max-w-2xl p-4">
                <h1 className="text-2xl font-bold">Create an event</h1>
                <p className="mb-6 text-muted-foreground">
                    Each event has its own teams, schedule, scoring and displays. You can host as many events as you like on one server.
                </p>

                <form onSubmit={submit} className="space-y-5">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Event name</Label>
                        <Input
                            id="name"
                            value={data.name}
                            required
                            placeholder="Tripoli Spring Scrimmage"
                            onChange={(e) => {
                                const name = e.target.value;
                                setData((current) => ({ ...current, name, code: codeWasEdited ? current.code : suggestCode(name) }));
                            }}
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="code">Event code</Label>
                        <Input
                            id="code"
                            value={data.code}
                            required
                            className="font-mono"
                            placeholder="tripoli_spring"
                            onChange={(e) => setData('code', e.target.value.toLowerCase())}
                        />
                        <p className="text-xs text-muted-foreground">
                            Lowercase letters, numbers and underscores. It appears in every URL (e.g. <code>/event/{data.code || 'code'}</code>) and can't
                            be changed later.
                        </p>
                        <InputError message={errors.code} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="type">Event type</Label>
                            <select
                                id="type"
                                className={selectClassName}
                                value={data.type}
                                onChange={(e) => setData('type', e.target.value as EventTypeValue)}
                            >
                                {eventTypes.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.type} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="field_count">Number of fields</Label>
                            <Input
                                id="field_count"
                                type="number"
                                min={1}
                                max={8}
                                value={data.field_count}
                                onChange={(e) => setData('field_count', Number(e.target.value))}
                            />
                            <InputError message={errors.field_count} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="venue">Venue</Label>
                        <Input id="venue" value={data.venue} placeholder="School gym, city" onChange={(e) => setData('venue', e.target.value)} />
                        <InputError message={errors.venue} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="grid gap-2">
                            <Label htmlFor="start_date">Start date</Label>
                            <Input id="start_date" type="date" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)} />
                            <InputError message={errors.start_date} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="end_date">End date</Label>
                            <Input id="end_date" type="date" value={data.end_date} onChange={(e) => setData('end_date', e.target.value)} />
                            <InputError message={errors.end_date} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="timezone">Time zone</Label>
                            <select id="timezone" className={selectClassName} value={data.timezone} onChange={(e) => setData('timezone', e.target.value)}>
                                {timezones.map((zone) => (
                                    <option key={zone} value={zone}>
                                        {zone}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.timezone} />
                        </div>
                    </div>

                    <div className="grid gap-2 rounded-lg border bg-muted/40 p-4">
                        <Label htmlFor="copy_game_from">Game setup</Label>
                        <select
                            id="copy_game_from"
                            className={selectClassName}
                            value={data.copy_game_from}
                            onChange={(e) => setData('copy_game_from', e.target.value)}
                        >
                            <option value="">Start empty (define score types later)</option>
                            {existingEvents.map((event) => (
                                <option key={event.code} value={event.code}>
                                    Copy score types &amp; timing from {event.name} ({event.code})
                                </option>
                            ))}
                        </select>
                        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Info className="mt-0.5 size-3.5 shrink-0" />
                            Reuse another event's game so a league can run every meet with the same rules. Teams and matches are never copied.
                        </p>
                        <InputError message={errors.copy_game_from} />
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={processing}>
                            Create event
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
