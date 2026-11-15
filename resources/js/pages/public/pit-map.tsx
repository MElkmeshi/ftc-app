import PitTeamTable, { type PitTeamColumn } from '@/components/pit-map/pit-team-table';
import PrintLayout from '@/layouts/print-layout';
import { fitZoom, mergeTeamsAndPits, PitLabelMode, PitMapCanvas, type PitMapConfig, type PitObject, type PitTeam } from '@/lib/pit-map';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

const PRINT_WIDTH = 1000;
const PRINT_START_ZOOM = 2;
const LONG_TEAM_LIST = 16;

function useSessionState<T extends string | boolean>(name: string, fallback: T): [T, (value: T) => void] {
    const key = `${typeof window === 'undefined' ? '' : window.location.pathname}_${name}`;
    const [value, setValue] = useState<T>(() => {
        const stored = typeof window === 'undefined' ? null : window.sessionStorage.getItem(key);

        if (stored === null) {
            return fallback;
        }

        return (typeof fallback === 'boolean' ? stored === '1' : stored) as T;
    });

    const store = (next: T) => {
        setValue(next);

        if (next === fallback) {
            window.sessionStorage.removeItem(key);
        } else {
            window.sessionStorage.setItem(key, typeof next === 'boolean' ? (next ? '1' : '0') : next);
        }
    };

    return [value, store];
}

function PitMapReport({ objects, config, teams }: { objects: PitObject[]; config: PitMapConfig; teams: PitTeam[] }) {
    const canvasElement = useRef<HTMLCanvasElement>(null);
    const wrapper = useRef<HTMLDivElement>(null);
    const map = useRef<PitMapCanvas | null>(null);
    const firstLabel = config.numbers ? PitLabelMode.NUMBER : config.addresses ? PitLabelMode.ADDRESS : PitLabelMode.TEAM;
    const [labelMode, setLabelMode] = useSessionState('labelMode', String(firstLabel));
    const [showTable, setShowTable] = useSessionState<boolean>('showTeamTable', true);
    const [pageBreak, setPageBreak] = useSessionState<boolean>('forcePageBreak', teams.length > LONG_TEAM_LIST);
    const [printColors, setPrintColors] = useSessionState<boolean>('printPitColors', false);
    const rows = useMemo(() => mergeTeamsAndPits(teams, objects), [teams, objects]);
    const columns: PitTeamColumn[] = [
        'number',
        'name',
        ...(config.numbers ? (['pit'] as const) : []),
        ...(config.addresses ? (['address'] as const) : []),
    ];

    useEffect(() => {
        if (!canvasElement.current) {
            return;
        }

        const canvas = new PitMapCanvas({ canvas: canvasElement.current, fitToContent: true });
        let screenZoom: number | null = null;

        map.current = canvas;
        canvas.setData(objects);
        canvas.setZoom(fitZoom(wrapper.current?.clientWidth ?? 0, canvas.getBoundingBox().w));

        const beforePrint = () => {
            screenZoom = canvas.getZoom();
            canvas.setZoom(fitZoom(PRINT_WIDTH, canvas.getBoundingBox().w, PRINT_START_ZOOM));
            canvas.setPrinting(true);
        };
        const afterPrint = () => {
            if (screenZoom !== null) {
                canvas.setZoom(screenZoom);
                screenZoom = null;
            }

            canvas.setPrinting(false);
        };

        window.addEventListener('beforeprint', beforePrint);
        window.addEventListener('afterprint', afterPrint);

        return () => {
            window.removeEventListener('beforeprint', beforePrint);
            window.removeEventListener('afterprint', afterPrint);
            canvas.destroy();
            map.current = null;
        };
    }, [objects]);

    useEffect(() => map.current?.setPitLabelMode(Number(labelMode) as PitLabelMode), [labelMode, objects]);
    useEffect(() => map.current?.setPrintPitColors(printColors), [printColors, objects]);

    return (
        <>
            <div className="flex w-full justify-start gap-1 print:hidden">
                <label>
                    Pit Label:{' '}
                    <select
                        id="labelMode"
                        className="border border-[#767676]"
                        value={labelMode}
                        onChange={(event) => setLabelMode(event.target.value)}
                    >
                        <option value={PitLabelMode.NUMBER}>Pit Number</option>
                        <option value={PitLabelMode.ADDRESS}>Pit Address</option>
                        <option value={PitLabelMode.TEAM}>Team Number</option>
                    </select>
                </label>
                <label>
                    <input type="checkbox" id="showTeamTable" checked={showTable} onChange={(event) => setShowTable(event.target.checked)} />
                    Show team table
                </label>
                <label>
                    <input type="checkbox" id="forcePageBreak" checked={pageBreak} onChange={(event) => setPageBreak(event.target.checked)} />
                    Force table to new page
                </label>
                <label>
                    <input type="checkbox" id="printPitColors" checked={printColors} onChange={(event) => setPrintColors(event.target.checked)} />
                    Print pit colors
                </label>
            </div>
            <div id="pitMapWrapper" ref={wrapper} className="w-full overflow-x-auto">
                <div className="mx-auto w-fit">
                    <canvas id="pitMap" ref={canvasElement} className="inline align-baseline" />
                </div>
            </div>
            {showTable && (
                <PitTeamTable
                    rows={rows}
                    columns={columns}
                    small
                    className={pageBreak ? 'break-before-page' : undefined}
                    onRowClick={(row) => map.current?.highlightTeam(row.number)}
                />
            )}
        </>
    );
}

export default function PitMap() {
    const { objects, config, teams, event } = usePage<SharedData & { objects: PitObject[] | null; config: PitMapConfig; teams: PitTeam[] }>().props;

    return (
        <PrintLayout title={`${event?.name ?? ''} Pit Map`}>
            {objects === null ? (
                <div className="ml-[8.333%]">No pit map has been published or created for this event</div>
            ) : (
                <PitMapReport objects={objects} config={config} teams={teams} />
            )}
        </PrintLayout>
    );
}
