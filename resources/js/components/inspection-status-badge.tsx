import { type InspectionStatus, inspectionStatusOf } from '@/lib/inspection-utils';
import { cn } from '@/lib/utils';

export function InspectionStatusBadge({ status, className }: { status: InspectionStatus; className?: string }) {
    const entry = inspectionStatusOf(status);

    return (
        <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', entry.className, className)}>
            {entry.label}
        </span>
    );
}
