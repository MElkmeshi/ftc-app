import { ServerAddressField } from '@/components/server-address-field';
import { Button } from '@/components/ui/button';
import { useServerAddress } from '@/hooks/use-server-address';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface DeviceLink {
    title: string;
    path: string;
    who: string;
}

const LINKS: DeviceLink[] = [
    { title: 'Schedule & results', path: 'schedule', who: 'Teams and spectators: their matches, scores and scoresheets' },
    { title: 'Rankings', path: 'rankings', who: 'Teams and spectators' },
    { title: 'Referee scoring', path: 'referee/scoring', who: 'Referee tablets (sign-in required)' },
    { title: 'Match control', path: 'match-control', who: 'Head referee (sign-in required)' },
    { title: 'Audience display', path: 'display?type=audience', who: 'Projector or TV for the audience' },
    { title: 'Field display', path: 'display?type=field', who: 'Screen facing the drive teams' },
    { title: 'Pit display', path: 'display?type=pit', who: 'TV in the pits' },
];

/**
 * QR codes that open each part of the event on a phone, tablet or display,
 * on the address those devices reach the server by (FTC Live shows its
 * server address for the same reason). Print it and tape it up at the venue.
 */
export default function ConnectDevices() {
    const { event } = usePage<SharedData>().props;
    const { address, setAddress, reset } = useServerAddress();
    const base = `${address}/event/${event?.code}`;

    const breadcrumbs: BreadcrumbItem[] = [{ title: 'Connect devices', href: '/connect' }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Connect devices" />

            <div className="space-y-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
                    <div>
                        <h1 className="text-2xl font-bold">Connect devices</h1>
                        <p className="text-muted-foreground">
                            Scan a code with a phone or tablet camera, or type the address. Print this page for the venue.
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-1 size-4" /> Print
                    </Button>
                </div>

                <div className="print:hidden">
                    <ServerAddressField address={address} onChange={setAddress} onReset={reset} />
                </div>

                <div className="hidden print:block">
                    <h1 className="text-2xl font-bold">{event?.name}</h1>
                    <p>Join the event network, then scan a code or type the address.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-2">
                    {LINKS.map((link) => {
                        const url = `${base}/${link.path}`;

                        return (
                            <div key={link.path} className="flex break-inside-avoid gap-4 rounded-lg border p-4">
                                <QRCodeSVG value={url} size={112} marginSize={1} className="shrink-0" />
                                <div className="min-w-0 space-y-1">
                                    <div className="font-semibold">{link.title}</div>
                                    <div className="text-muted-foreground text-sm">{link.who}</div>
                                    <a href={url} className="text-primary block font-mono text-xs break-all hover:underline">
                                        {url}
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </AppLayout>
    );
}
