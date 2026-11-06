import { TopNavbar } from '@/components/top-navbar';
import { resolveEventHref } from '@/lib/event';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

function backLink(breadcrumbs: BreadcrumbItem[], eventCode: string | null, url: string): { title: string; href: string } | null {
    if (breadcrumbs.length > 1) {
        const previous = breadcrumbs[breadcrumbs.length - 2];

        return { title: previous.title, href: resolveEventHref(previous.href) };
    }

    if (!eventCode) {
        return null;
    }

    const eventHome = `/event/${eventCode}`;

    if (url === eventHome || url.startsWith(`${eventHome}?`)) {
        return null;
    }

    return { title: 'Event Home', href: eventHome };
}

export function TopNavPage({ breadcrumbs = [], children }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    const { props, url } = usePage<SharedData>();
    const back = backLink(breadcrumbs, props.event?.code ?? null, url);

    return (
        <div className="bg-background text-foreground min-h-screen">
            <div className="mx-auto w-full max-w-[1320px] px-3 pb-8 shadow-[0_0_12px_rgba(0,0,0,0.12)] print:max-w-none print:px-0 print:shadow-none">
                <TopNavbar />
                <hr className="my-4 border-t border-black/25 print:hidden" />
                {back && (
                    <Link href={back.href} className="mb-2 inline-block text-[#0d6efd] underline print:hidden">
                        &lt;&lt; Back to {back.title}
                    </Link>
                )}
                <div className="flex flex-col gap-4">{children}</div>
            </div>
        </div>
    );
}

export default function AppTopNavLayout({ children, breadcrumbs = [] }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return <TopNavPage breadcrumbs={breadcrumbs}>{children}</TopNavPage>;
}
