import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    const currentYear = new Date().getFullYear();

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f8fa] p-6 dark:bg-gray-900">
            <div className="w-full max-w-md">
                <div className="rounded-2xl border-0 bg-white p-8 shadow-lg dark:bg-gray-800">
                    <div className="mb-8 text-center">
                        <div className="mb-4 flex justify-center">
                            <img src="/stokity-icon.png" alt="Stokity Logo" className="h-24 w-24 object-contain" />
                        </div>
                        <h2 className="mb-2 inline-block bg-gradient-to-r from-[#c850c0] to-[#ffcc70] bg-clip-text text-4xl font-bold text-transparent">
                            {title}
                        </h2>
                        <p className="mb-6 text-gray-600 dark:text-gray-300">{description}</p>
                    </div>
                    {children}
                </div>
                <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    © {currentYear} Stokity. Todos los derechos reservados.
                </div>
            </div>
        </div>
    );
}
