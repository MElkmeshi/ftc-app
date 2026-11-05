export type InspectionStatus = 'not_started' | 'in_progress' | 'incomplete' | 'passed';

export interface TeamInspectionStatus {
    id: number;
    number: number | string;
    name: string | null;
    status: InspectionStatus;
}

export const INSPECTION_STATUSES: { value: InspectionStatus; label: string; className: string }[] = [
    { value: 'not_started', label: 'Not started', className: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border' },
    { value: 'in_progress', label: 'In progress', className: 'bg-sky-500 text-white' },
    { value: 'incomplete', label: 'Incomplete', className: 'bg-amber-500 text-white' },
    { value: 'passed', label: 'Passed', className: 'bg-emerald-600 text-white' },
];

export function inspectionStatusOf(status: InspectionStatus) {
    return INSPECTION_STATUSES.find((entry) => entry.value === status) ?? INSPECTION_STATUSES[0];
}

export function passedShare(teams: TeamInspectionStatus[]): number {
    if (teams.length === 0) {
        return 0;
    }

    return Math.round((teams.filter((team) => team.status === 'passed').length / teams.length) * 100);
}
