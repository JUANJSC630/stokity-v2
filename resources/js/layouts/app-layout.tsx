import ImpersonationBanner from '@/components/impersonation-banner';
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    headerActions?: ReactNode;
}

export default ({ children, breadcrumbs, headerActions, ...props }: AppLayoutProps) => (
    <>
        <ImpersonationBanner />
        <AppLayoutTemplate breadcrumbs={breadcrumbs} headerActions={headerActions} {...props}>
            {children}
            <Toaster position="top-right" />
        </AppLayoutTemplate>
    </>
);
