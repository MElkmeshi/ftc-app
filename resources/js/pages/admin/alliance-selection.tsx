import { MatchControlTabs } from '@/components/match-control-tabs';
import { AllianceSelectionPanel } from '@/components/match-control/alliance-selection-panel';
import { eventUrl } from '@/lib/event';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

export default function AllianceSelectionPage() {
    const { event, name } = usePage<SharedData>().props;

    return (
        <div className="min-h-screen bg-[#354a54] text-lg text-white">
            <Head title="Alliance Selection" />

            <div className="bg-gradient-to-b from-[#2b424d] to-[#263840] px-2 pt-2 pb-3">
                <div className="flex items-start justify-between">
                    <Link href={eventUrl('/match-control')} className="rounded-md border border-white bg-white px-2 py-1 text-base text-black">
                        Exit
                    </Link>
                    <span>
                        <span className="font-mono font-bold">{event?.code}</span> - <span className="italic">{name}</span>
                    </span>
                </div>
                <h1 className="-mt-2 text-center text-[2rem] leading-tight font-bold">Alliance Selection</h1>
            </div>

            <MatchControlTabs active="alliance" />

            <AllianceSelectionPanel />
        </div>
    );
}
