import { type InspectionStatus, inspectionStatusOf, type TeamInspectionStatus } from '@/lib/inspection-utils';
import { cn } from '@/lib/utils';

const FTC_STATUSES: Record<InspectionStatus, { label: string; legendClassName: string; cellClassName: string }> = {
    not_started: { label: 'Not Started', legendClassName: 'bg-transparent text-black', cellClassName: 'text-black' },
    in_progress: { label: 'In Progress', legendClassName: 'bg-[#00ffff] text-black', cellClassName: 'bg-[#00ffff]! text-black' },
    incomplete: { label: 'Incomplete', legendClassName: 'bg-[#f0e442] text-black', cellClassName: 'bg-[#f0e442]! text-black' },
    passed: { label: 'Passed', legendClassName: 'bg-[#32cd32] text-white', cellClassName: 'bg-[#32cd32]! text-white' },
};

const LEGEND_ORDER: InspectionStatus[] = ['not_started', 'in_progress', 'incomplete', 'passed'];
const PROGRESS_ORDER: InspectionStatus[] = ['passed', 'in_progress', 'incomplete', 'not_started'];

export function inspectionStatusLabel(status: InspectionStatus): string {
    return (FTC_STATUSES[status] ?? FTC_STATUSES.not_started).label;
}

export function inspectionStatusCellClass(status: InspectionStatus): string {
    return (FTC_STATUSES[status] ?? FTC_STATUSES.not_started).cellClassName;
}

export function InspectionStatusBadge({ status, className }: { status: InspectionStatus; className?: string }) {
    const entry = inspectionStatusOf(status);

    return (
        <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', entry.className, className)}>
            {entry.label}
        </span>
    );
}

export function InspectionStatusLegend({ teams }: { teams: Pick<TeamInspectionStatus, 'status'>[] }) {
    const shares = PROGRESS_ORDER.map((status) => ({
        status,
        percent: teams.length === 0 ? 0 : (teams.filter((team) => team.status === status).length / teams.length) * 100,
    })).filter((share) => share.percent > 0);

    return (
        <>
            Legend:
            <div className="mb-2 flex text-center">
                {LEGEND_ORDER.map((status) => (
                    <div
                        key={status}
                        className={cn('max-w-[125px] flex-1 border border-black px-3 whitespace-nowrap', FTC_STATUSES[status].legendClassName)}
                    >
                        {FTC_STATUSES[status].label}
                    </div>
                ))}
            </div>
            <div className="flex h-4 overflow-hidden rounded-md bg-[#e9ecef] text-xs">
                {shares.map((share) => {
                    const title = `${Math.round(share.percent)}% ${FTC_STATUSES[share.status].label}`;

                    return (
                        <div
                            key={share.status}
                            title={title}
                            style={{ width: `${share.percent}%` }}
                            className={cn(
                                'flex flex-col justify-center overflow-hidden text-center whitespace-nowrap',
                                FTC_STATUSES[share.status].legendClassName,
                            )}
                        >
                            {title}
                        </div>
                    );
                })}
            </div>
            <div className="mb-2" />
        </>
    );
}
