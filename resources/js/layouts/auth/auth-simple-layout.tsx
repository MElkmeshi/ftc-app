import { TopNavPage } from '@/layouts/app/app-top-nav-layout';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    if (!title) {
        return <TopNavPage>{children}</TopNavPage>;
    }

    return (
        <TopNavPage>
            <h1 className="mb-2 text-center text-[2rem] leading-tight font-medium">{title}</h1>
            {description && <p className="mb-4 text-center">{description}</p>}
            <div className="mx-auto w-full max-w-[440px]">{children}</div>
        </TopNavPage>
    );
}
