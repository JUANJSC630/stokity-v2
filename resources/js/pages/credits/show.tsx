import { CreditDetailPanel } from '@/components/credits/credit-detail-panel';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type CreditSale, type PaymentMethod } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';

interface Props {
    credit: CreditSale;
    paymentMethods: PaymentMethod[];
    canCancel: boolean;
    canUpdateInstallments: boolean;
}

export default function CreditShow({ credit, canCancel, canUpdateInstallments }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inicio', href: '/dashboard' },
        { title: 'Créditos', href: '/credits' },
        { title: credit.code, href: `/credits/${credit.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Crédito ${credit.code}`} />

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
                <Link
                    href="/credits"
                    className="flex h-11 w-fit items-center gap-1.5 rounded-lg pr-3 text-sm text-muted-foreground transition-colors hover:text-foreground sm:h-9"
                >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Volver a créditos
                </Link>
                <CreditDetailPanel credit={credit} canCancel={canCancel} canUpdateInstallments={canUpdateInstallments} headingLevel={1} />
            </div>
        </AppLayout>
    );
}
