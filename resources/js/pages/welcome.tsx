import { type BusinessSetting, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import AllRightsReserved from '@/components/common/AllRightsReserved';

export default function Welcome() {
    const { auth, business } = usePage<SharedData & { business: BusinessSetting }>().props;

    const logoSrc = business?.logo_url || '/stokity-icon.png';
    const businessName = business?.name || 'Stokity';

    return (
        <>
            <Head title={`Bienvenido — ${businessName}`} />
            <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f8fa] p-6 dark:bg-gray-900">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
                    <div className="mb-8 text-center">
                        <div className="mb-4 flex justify-center">
                            <img
                                src={logoSrc}
                                alt={businessName}
                                className="h-24 w-24 rounded-xl object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/stokity-icon.png';
                                }}
                            />
                        </div>
                        <h1 className="mb-2 inline-block font-serif text-3xl font-bold text-gray-700">{businessName}</h1>

                        <div className="mt-6 flex justify-center">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-xl px-6 py-2 font-medium text-white shadow-md transition-all duration-200"
                                    style={{
                                        background: 'linear-gradient(90deg, #C850C0 0%, #FFCC70 100%)',
                                        boxShadow: '0 6px 18px 0 rgba(200,80,192,0.2)',
                                    }}
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <Link
                                    href={route('login')}
                                    className="rounded-xl px-6 py-2 font-medium text-white shadow-md transition-all duration-200"
                                    style={{
                                        background: 'linear-gradient(90deg, #C850C0 0%, #FFCC70 100%)',
                                        boxShadow: '0 6px 18px 0 rgba(200,80,192,0.2)',
                                    }}
                                >
                                    Iniciar sesión
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                        <AllRightsReserved />
                    </div>
                </div>
            </div>
        </>
    );
}
