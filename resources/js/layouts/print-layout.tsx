import { Button } from '@/components/ui/button';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { type ReactNode } from 'react';

/**
 * Plain white pages meant for paper: a toolbar on screen, nothing but the
 * content when printed.
 */
export default function PrintLayout({ title, toolbar, children }: { title: string; toolbar?: ReactNode; children: ReactNode }) {
    const { event } = usePage<SharedData>().props;

    return (
        <div className="min-h-screen bg-white text-black">
            <Head title={title} />
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-white/95 px-4 py-2 backdrop-blur print:hidden">
                <Link href={`/event/${event?.code}/reports`} className="text-muted-foreground flex items-center gap-1 text-sm hover:underline">
                    <ArrowLeft className="size-4" /> Reports
                </Link>
                <h1 className="font-semibold">{title}</h1>
                <div className="ml-auto flex flex-wrap items-center gap-3">
                    {toolbar}
                    <Button size="sm" onClick={() => window.print()}>
                        <Printer className="mr-1 size-4" /> Print
                    </Button>
                </div>
            </div>
            <div className="mx-auto max-w-4xl p-6 print:max-w-none print:p-0">{children}</div>
        </div>
    );
}
