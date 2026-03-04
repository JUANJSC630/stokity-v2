import { usePage } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';
import { type BusinessSetting } from '@/types';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, description }: PropsWithChildren<AuthLayoutProps>) {
    const { business } = usePage<{ business: BusinessSetting }>().props;
    const currentYear = new Date().getFullYear();

    const logoSrc = business?.logo_url || '/stokity-icon.png';
    const businessName = business?.name || 'Stokity';

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f8fa] p-6 dark:bg-gray-900">
            <div className="w-full max-w-md">
                <div className="rounded-2xl border-0 bg-white p-8 shadow-lg dark:bg-gray-800">
                    <div className="mb-8 text-center">
                        <div className="mb-4 flex justify-center">
                            <img
                                src={logoSrc}
                                alt={businessName}
                                className="h-24 w-24 rounded-xl object-contain"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/stokity-icon.png'; }}
                            />
                        </div>
                        <h2 className="mb-2 inline-block bg-gradient-to-r from-[#c850c0] to-[#ffcc70] bg-clip-text text-3xl font-bold text-transparent">
                            {businessName}
                        </h2>
                        {description && (
                            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{description}</p>
                        )}
                    </div>
                    {children}
                </div>
                <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    © {currentYear} {businessName}. Todos los derechos reservados.
                </div>
            </div>
        </div>
    );
}
