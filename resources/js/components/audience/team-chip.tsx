import { cn } from '@/lib/utils';
import { type MatchAlliance } from '@/types';

/** One team on an audience screen: big number, name underneath. */
export function TeamChip({ member, color, size = 'md' }: { member: MatchAlliance; color: 'red' | 'blue'; size?: 'md' | 'lg' }) {
    return (
        <div className={cn('flex flex-col items-center rounded-xl px-4 py-2', color === 'red' ? 'bg-red-500/20' : 'bg-blue-500/20')}>
            <span className={cn('font-black text-white tabular-nums', size === 'lg' ? 'text-6xl' : 'text-3xl')}>{member.team.number}</span>
            <span
                className={cn(
                    'max-w-80 truncate font-medium',
                    color === 'red' ? 'text-red-200' : 'text-blue-200',
                    size === 'lg' ? 'text-2xl' : 'text-base',
                )}
            >
                {member.team.name}
            </span>
        </div>
    );
}
