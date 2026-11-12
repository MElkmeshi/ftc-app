import InputError from '@/components/input-error';
import PublicLayout from '@/layouts/public-layout';
import { bs } from '@/lib/bootstrap';
import { type EventTypeOption, type EventTypeValue, type GameOption } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { type FormEventHandler } from 'react';

interface CreateEventProps {
    eventTypes: EventTypeOption[];
    games: GameOption[];
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
    game_id: string;
}

function suggestCode(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 32);
}

export default function CreateEvent() {
    const { eventTypes, games, defaultTimezone } = usePage<CreateEventProps>().props;
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
        game_id: games[0] ? String(games[0].id) : '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/events');
    };

    return (
        <PublicLayout>
            <Head title="Create Event" />

            <div className="mx-auto w-full md:w-1/2">
                <h2 className={bs.h2}>Create Event</h2>
                <hr className="my-4 border-t border-black/25" />
                <form onSubmit={submit}>
                    <div className="mb-2">
                        <label htmlFor="eventCodeInput" className={bs.formLabel}>
                            Event Code:
                        </label>
                        <input
                            id="eventCodeInput"
                            type="text"
                            className={bs.formControl}
                            placeholder="Event Code"
                            required
                            value={data.code}
                            onChange={(e) => setData('code', e.target.value.toLowerCase())}
                        />
                        <InputError message={errors.code} />
                    </div>
                    <div className="mb-2">
                        <label htmlFor="eventNameInput" className={bs.formLabel}>
                            Event Name:
                        </label>
                        <input
                            id="eventNameInput"
                            type="text"
                            className={bs.formControl}
                            placeholder="Event Name"
                            required
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                        />
                        <InputError message={errors.name} />
                    </div>
                    <div className="mb-2">
                        <label htmlFor="eventTypeInput" className={bs.formLabel}>
                            Event Type:
                        </label>
                        <select
                            id="eventTypeInput"
                            className={bs.formSelect}
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
                    <div>
                        <label htmlFor="timeZoneInput">Time zone:</label>
                        <select
                            id="timeZoneInput"
                            className={bs.formSelect}
                            value={data.timezone}
                            onChange={(e) => setData('timezone', e.target.value)}
                        >
                            {timezones.map((zone) => (
                                <option key={zone} value={zone}>
                                    {zone}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.timezone} />
                    </div>
                    <div className="mb-2">
                        <label htmlFor="startDatePicker" className={bs.formLabel}>
                            Event Start Date:
                        </label>
                        <input
                            id="startDatePicker"
                            type="date"
                            className={bs.formControl}
                            value={data.start_date}
                            onChange={(e) => setData('start_date', e.target.value)}
                        />
                        <InputError message={errors.start_date} />
                    </div>
                    <div className="mb-2">
                        <label htmlFor="endDatePicker" className={bs.formLabel}>
                            Event End Date:
                        </label>
                        <input
                            id="endDatePicker"
                            type="date"
                            className={bs.formControl}
                            value={data.end_date}
                            onChange={(e) => setData('end_date', e.target.value)}
                        />
                        <InputError message={errors.end_date} />
                    </div>
                    <br />
                    <div className="mb-2">
                        <label htmlFor="fieldNumberInput" className={bs.formLabel}>
                            Number of Fields:
                        </label>
                        <input
                            id="fieldNumberInput"
                            type="number"
                            min={1}
                            max={8}
                            className={bs.formControl}
                            placeholder="Number of Fields"
                            value={data.field_count}
                            onChange={(e) => setData('field_count', Number(e.target.value))}
                        />
                        <InputError message={errors.field_count} />
                    </div>
                    <div className="mb-2">
                        <label htmlFor="gameInput" className={bs.formLabel}>
                            Game:
                        </label>
                        <select id="gameInput" className={bs.formSelect} value={data.game_id} onChange={(e) => setData('game_id', e.target.value)}>
                            {games.map((game) => (
                                <option key={game.id} value={game.id}>
                                    {game.name}
                                </option>
                            ))}
                            <option value="">New blank game</option>
                        </select>
                        <InputError message={errors.game_id} />
                    </div>
                    <br />
                    <button type="submit" className={bs.btnPrimary} disabled={processing}>
                        Create Event
                    </button>
                </form>

                <ImportEventForm />
            </div>
        </PublicLayout>
    );
}

function ImportEventForm() {
    const { data, setData, post, errors, processing, progress } = useForm<{ file: File | null; code: string }>({ file: null, code: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/events/import', { forceFormData: true });
    };

    return (
        <section>
            <hr className="my-4 border-t border-black/25" />
            <h2 className={bs.h2}>Import Event</h2>
            <form onSubmit={submit}>
                <div className="mb-2">
                    <label htmlFor="importFileInput" className={bs.formLabel}>
                        Event File:
                    </label>
                    <input
                        id="importFileInput"
                        type="file"
                        accept="application/json,.json"
                        className={bs.formControl}
                        onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            setData((previous) => ({
                                file,
                                code: previous.code || (file ? suggestCode(file.name.replace(/-\d.*$/, '').replace(/\.json$/i, '')) : ''),
                            }));
                        }}
                    />
                    <InputError message={errors.file} />
                </div>
                <div className="mb-2">
                    <label htmlFor="importCodeInput" className={bs.formLabel}>
                        Event Code:
                    </label>
                    <input
                        id="importCodeInput"
                        type="text"
                        className={bs.formControl}
                        placeholder="Event Code"
                        value={data.code}
                        onChange={(e) => setData('code', e.target.value.toLowerCase())}
                    />
                    <InputError message={errors.code} />
                </div>
                <button type="submit" className={bs.btnPrimary} disabled={processing || !data.file}>
                    {progress ? `${progress.percentage ?? 0}%` : 'Import Event'}
                </button>
            </form>
        </section>
    );
}
