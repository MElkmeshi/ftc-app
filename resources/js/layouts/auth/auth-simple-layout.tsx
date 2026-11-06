import { TopNavPage } from '@/layouts/app/app-top-nav-layout';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

/** Sign-in and account pages inside the event navbar, like FTC Live's login page. */
export default function AuthSimpleLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    return (
        <TopNavPage>
            {title && <h1 className="mb-2 text-center text-[2rem] leading-tight font-medium">{title}</h1>}
            {description && <p className="mb-4 text-center">{description}</p>}
            <div className="mx-auto w-full max-w-[440px]">{children}</div>
        </TopNavPage>
    );
}
