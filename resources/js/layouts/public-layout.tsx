import { TopNavPage } from '@/layouts/app/app-top-nav-layout';
import { type ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
    return <TopNavPage>{children}</TopNavPage>;
}
