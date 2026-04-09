import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import BrandColors from '@/components/brand-colors';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren, type ReactNode } from 'react';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
    headerActions,
}: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[]; headerActions?: ReactNode }>) {
    return (
        <AppShell variant="sidebar">
            <BrandColors />
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <AppSidebarHeader breadcrumbs={breadcrumbs} actions={headerActions} />
                {children}
            </AppContent>
        </AppShell>
    );
}
