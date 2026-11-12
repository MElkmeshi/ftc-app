import { TopNavPage } from '@/layouts/app/app-top-nav-layout';
import { type ReactNode } from 'react';

export default function PublicLayout({ children, hideBack = false }: { children: ReactNode; hideBack?: boolean }) {
    return <TopNavPage hideBack={hideBack}>{children}</TopNavPage>;
}
