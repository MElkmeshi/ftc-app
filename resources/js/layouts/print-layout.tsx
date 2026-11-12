import AppLayout from '@/layouts/app-layout';
import { bs } from '@/lib/bootstrap';
import { cn } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { type ReactNode } from 'react';

interface PrintLayoutProps {
    title: string;
    toolbar?: ReactNode;
    plain?: boolean;
    printable?: boolean;
    children: ReactNode;
}

export function PrintButton({ className }: { className?: string }) {
    return (
        <button type="button" title="Print" onClick={() => window.print()} className={cn(bs.btnLight, 'print:hidden', className)}>
            <Printer className="inline size-8" strokeWidth={2.5} />
        </button>
    );
}

export function ReportRow({ className, children }: { className?: string; children: ReactNode }) {
    return <div className={cn('-mx-3 print:mx-0', className)}>{children}</div>;
}

/**
 * FTC Live's report chrome: the "<< Back to Reports" link, the centred title
 * with the page's options on its left and the print button on its right.
 * Plain reports only get the print button, level with the back link.
 */
export default function PrintLayout({ title, toolbar, plain = false, printable = true, children }: PrintLayoutProps) {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Reports', href: '/reports' },
                { title, href: '' },
            ]}
        >
            <Head title={title} />
            <div className="text-base leading-normal text-[#212529]">
                {plain ? (
                    <>
                        {printable && (
                            <div className="-mt-8 ml-auto w-fit print:hidden">
                                <PrintButton />
                            </div>
                        )}
                        {toolbar}
                    </>
                ) : (
                    <ReportRow className="mt-4 flex flex-wrap justify-center">
                        <div className="w-3/12 px-3 print:hidden">{toolbar ?? ' '}</div>
                        <h2 className={cn(bs.h2, 'w-6/12 px-3 text-center')}>{title}</h2>
                        <div className={cn(printable ? 'w-2/12' : 'w-3/12', 'px-3 print:hidden')}>&nbsp;</div>
                        {printable && <PrintButton className="w-1/12" />}
                    </ReportRow>
                )}
                {children}
            </div>
        </AppLayout>
    );
}
