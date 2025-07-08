import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="Bienvenido a Stokity">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=poppins:400,500,600,700" rel="stylesheet" />
            </Head>
            <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f8fa] p-6 dark:bg-gray-900">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
                    <div className="mb-8 text-center">
                        <div className="mb-4 flex justify-center">
                            <img src="/stokity-icon.png" alt="Stokity Logo" className="h-24 w-24 object-contain" />
                        </div>
                        <h1 className="mb-2 inline-block bg-gradient-to-r from-[#c850c0] to-[#ffcc70] bg-clip-text text-4xl font-bold text-transparent">
                            Stokity
                        </h1>
                        <p className="mb-6 text-gray-600 dark:text-gray-300">
                            Sistema simple para registrar ventas y gestionar productos en tu negocio
                        </p>

                        <div className="flex justify-center">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-xl px-8 py-3 font-medium text-white shadow-md transition-all duration-200"
                                    style={{
                                        background: 'linear-gradient(90deg, #C850C0 0%, #FFCC70 100%)',
                                        border: 'none',
                                        boxShadow: '0 6px 18px 0 rgba(200, 80, 192, 0.2)',
                                    }}
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <Link
                                    href={route('login')}
                                    className="rounded-xl px-8 py-3 font-medium text-white shadow-md transition-all duration-200"
                                    style={{
                                        background: 'linear-gradient(90deg, #C850C0 0%, #FFCC70 100%)',
                                        border: 'none',
                                        boxShadow: '0 6px 18px 0 rgba(200, 80, 192, 0.2)',
                                    }}
                                >
                                    Iniciar sesión
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                        © {new Date().getFullYear()} Stokity. Todos los derechos reservados.
                    </div>
                </div>
            </div>
        </>
    );
}
