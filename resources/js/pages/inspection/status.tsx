import PublicLayout from '@/layouts/public-layout';
import { bs } from '@/lib/bootstrap';
import { type InspectionStatus, type TeamInspectionStatus } from '@/lib/inspection-utils';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, usePage, useProp } from '@inertiajs/react';

const STATUS_LABELS: Record<InspectionStatus, string> = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    incomplete: 'Incomplete',
    passed: 'Passed',
};

const STATUS_COLORS: Record<InspectionStatus, string> = {
    not_started: 'bg-transparent text-black',
    in_progress: 'bg-[#00ffff] text-black',
    incomplete: 'bg-[#f0e442] text-black',
    passed: 'bg-[#32cd32] text-white',
};

const PROGRESS_ORDER: InspectionStatus[] = ['passed', 'in_progress', 'incomplete', 'not_started'];
const LEGEND_ORDER: InspectionStatus[] = ['not_started', 'in_progress', 'incomplete', 'passed'];

const STATUS_TABLE =
    'border-collapse border-[3px] border-black text-center [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black [&_th]:font-bold';

function readProjectorColumns(): number | null {
    const columns = Number(new URLSearchParams(window.location.search).get('columns'));

    return columns >= 1 && columns <= 3 ? columns : null;
}

function splitIntoColumns(teams: TeamInspectionStatus[], columns: number): TeamInspectionStatus[][] {
    const perColumn = Math.max(1, Math.ceil(teams.length / columns));

    return Array.from({ length: columns }, (_, index) => teams.slice(index * perColumn, (index + 1) * perColumn));
}

function StatusBoard({ projector }: { projector: boolean }) {
    const { event } = usePage<SharedData>().props;
    const { value: teams = [] } = useProp<TeamInspectionStatus[]>('teams');
    const columns = readProjectorColumns() ?? 1;

    return (
        <div>
            <div className={cn('pointer-events-none flex', !projector && '-mt-6')}>
                {!projector && (
                    <div className="invisible" aria-hidden>
                        &lt;&lt; Back to Event Home
                    </div>
                )}
                <div className="flex-1">
                    <h1 className={cn(bs.h1, 'text-center')}>{event?.name}</h1>
                    <h4 className={cn(bs.h4, 'text-center')}>Inspection Status</h4>
                </div>
                {!projector && (
                    <div className="pointer-events-auto print:hidden">
                        <b>Projector Friendly:</b>
                        <br />
                        <a href="?columns=1" className={bs.link}>
                            1 column
                        </a>
                        <br />
                        <a href="?columns=2" className={bs.link}>
                            2 columns
                        </a>
                        <br />
                        <a href="?columns=3" className={bs.link}>
                            3 columns
                        </a>
                        <br />
                    </div>
                )}
            </div>

            <div className="flex h-4 overflow-hidden rounded-md bg-[#e9ecef] text-xs">
                {PROGRESS_ORDER.map((status) => {
                    const count = teams.filter((team) => team.status === status).length;
                    const share = teams.length === 0 ? 0 : Math.round((count / teams.length) * 100);
                    const label = `${share}% ${STATUS_LABELS[status]}`;

                    return count === 0 ? null : (
                        <div
                            key={status}
                            title={label}
                            className={cn('flex flex-col justify-center overflow-hidden text-center whitespace-nowrap', STATUS_COLORS[status])}
                            style={{ width: `${(count / teams.length) * 100}%` }}
                        >
                            {label}
                        </div>
                    );
                })}
            </div>

            <table className="w-full text-[20px]">
                <tbody>
                    <tr className="align-top">
                        {splitIntoColumns(teams, columns).map((columnTeams, columnIndex) => (
                            <td key={columnIndex} className="p-[5px]" style={{ width: `${100 / columns}%` }}>
                                <table className={cn(STATUS_TABLE, 'w-full')}>
                                    <tbody>
                                        <tr>
                                            <th>R</th>
                                            <th className="px-5">Team</th>
                                            <th>Name</th>
                                        </tr>
                                        {columnTeams.map((team) => (
                                            <tr key={team.id}>
                                                <td className={cn('w-[7.5%] font-bold', STATUS_COLORS[team.status])}>&nbsp;</td>
                                                <td className="w-px px-5 whitespace-nowrap">{team.number}</td>
                                                <td className="px-2.5 text-left">{team.name}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>

            <table className={cn(STATUS_TABLE, 'mx-auto [&_td]:px-2 [&_th]:px-2')}>
                <tbody>
                    <tr>
                        <th>Name</th>
                        <td>Robot Inspection</td>
                    </tr>
                    <tr>
                        <th>Symbol</th>
                        <td>R</td>
                    </tr>
                </tbody>
            </table>
            <table className={cn(STATUS_TABLE, 'mx-auto mt-[5px] [&_td]:px-2 [&_th]:px-2')}>
                <tbody>
                    <tr>
                        <th>Status</th>
                        {LEGEND_ORDER.map((status) => (
                            <td key={status}>{STATUS_LABELS[status]}</td>
                        ))}
                    </tr>
                    <tr>
                        <th>Color</th>
                        {LEGEND_ORDER.map((status) => (
                            <td key={status} className={STATUS_COLORS[status]}>
                                &nbsp;
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export default function InspectionStatusBoard() {
    const projector = readProjectorColumns() !== null;

    if (projector) {
        return (
            <div className="min-h-screen bg-white p-3 text-[#212529]">
                <Head title="Inspection Status" />
                <StatusBoard projector />
            </div>
        );
    }

    return (
        <PublicLayout>
            <Head title="Inspection Status" />
            <StatusBoard projector={false} />
        </PublicLayout>
    );
}
