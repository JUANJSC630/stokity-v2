import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import BrandColors from '@/components/brand-colors';
import ImpersonationBanner from '@/components/impersonation-banner';
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
            {/* Inside the content column, not a sibling of the sidebar: the
                sidebar rail is `position: fixed` to the viewport, so a banner
                mounted above this whole layout would render underneath it
                instead of pushing it down. */}
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <ImpersonationBanner />
                <AppSidebarHeader breadcrumbs={breadcrumbs} actions={headerActions} />
                {children}
            </AppContent>
        </AppShell>
    );
}
