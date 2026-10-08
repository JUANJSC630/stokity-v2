import BrandColors from '@/components/brand-colors';
import AllRightsReserved from '@/components/common/AllRightsReserved';
import { type BusinessSetting, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, BarChart2, Package, ShoppingCart, Wallet } from 'lucide-react';

const FEATURES = [
    { icon: ShoppingCart, label: 'Ventas' },
    { icon: Package, label: 'Inventario' },
    { icon: Wallet, label: 'Caja' },
    { icon: BarChart2, label: 'Reportes' },
];

export default function Welcome() {
    const { auth, business } = usePage<SharedData & { business: BusinessSetting }>().props;

    const logoSrc = business?.logo_url || '/stokity-icon.png';
    const businessName = business?.name || 'Stokity';

    return (
        <>
            <BrandColors />
            <Head title={`Bienvenido — ${businessName}`} />

            <div
                className="relative flex min-h-screen flex-col overflow-hidden"
                style={{
                    background: `
                        radial-gradient(ellipse 900px 700px at 88% 5%,  rgba(var(--brand-primary-rgb), 0.10) 0%, transparent 60%),
                        radial-gradient(ellipse 700px 900px at 12% 98%, rgba(var(--brand-secondary-rgb), 0.10) 0%, transparent 60%),
                        radial-gradient(ellipse 500px 500px at 50% 45%, rgba(var(--brand-primary-rgb), 0.04) 0%, transparent 70%),
                        oklch(0.975 0.005 30)
                    `,
                }}
            >
                {/* ── Animated atmosphere orbs ─────────────────────────────── */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div
                        className="auth-orb absolute -top-16 -right-16 h-[460px] w-[460px] rounded-full blur-[90px]"
                        style={{ background: 'rgba(var(--brand-primary-rgb), 0.13)', animation: 'orb-drift-1 14s ease-in-out infinite' }}
                    />
                    <div
                        className="auth-orb absolute -bottom-20 -left-20 h-[520px] w-[520px] rounded-full blur-[110px]"
                        style={{ background: 'rgba(var(--brand-secondary-rgb), 0.13)', animation: 'orb-drift-2 18s ease-in-out infinite' }}
                    />
                    <div
                        className="auth-orb absolute top-1/3 right-1/4 h-64 w-64 rounded-full blur-[70px]"
                        style={{ background: 'rgba(var(--brand-primary-rgb), 0.06)', animation: 'orb-drift-1 10s ease-in-out infinite reverse' }}
                    />
                </div>

                {/* ── Hero ─────────────────────────────────────────────────── */}
                <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pt-14 pb-12 text-center">
                    <div
                        className="welcome-animate welcome-d1 mb-12 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-widest uppercase"
                        style={{
                            background: 'rgba(var(--brand-primary-rgb), 0.09)',
                            color: 'var(--brand-primary)',
                            border: '1px solid rgba(var(--brand-primary-rgb), 0.2)',
                        }}
                    >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--brand-primary)' }} />
                        Sistema de Gestión POS
                    </div>

                    <div className="welcome-animate welcome-d2 relative mb-8 flex items-center justify-center" style={{ width: 112, height: 112 }}>
                        <div className="logo-ring" style={{ width: 118, height: 118, animationDelay: '0s' }} />
                        <div className="logo-ring" style={{ width: 118, height: 118, animationDelay: '1.4s' }} />
                        <img
                            src={logoSrc}
                            alt={businessName}
                            className="relative z-10 rounded-2xl object-contain"
                            style={{ width: 112, height: 112, boxShadow: '0 12px 40px rgba(var(--brand-primary-rgb), 0.18)' }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = '/stokity-icon.png';
                            }}
                        />
                    </div>

                    <h1
                        className="welcome-animate welcome-d3 max-w-5xl font-serif font-semibold text-balance"
                        style={{ fontSize: 'clamp(44px, 8vw, 96px)', lineHeight: 1.02, color: 'oklch(0.22 0.02 30)', letterSpacing: '-0.03em' }}
                    >
                        {businessName}
                    </h1>

                    <div className="welcome-animate welcome-d4 my-7 h-0.5 w-14 rounded-full" style={{ background: 'var(--brand-primary)' }} />

                    <p className="welcome-animate welcome-d4 max-w-md text-lg leading-relaxed text-balance" style={{ color: 'oklch(0.5 0.02 30)' }}>
                        Tu punto de venta profesional, listo para crecer con tu negocio
                    </p>

                    <div className="welcome-animate welcome-d5 mt-9">
                        <Link
                            href={auth.user ? route('dashboard') : route('login')}
                            className="btn-auth group"
                            style={{ width: 'auto', paddingLeft: '2.5rem', paddingRight: '2.5rem', fontSize: '1rem' }}
                        >
                            {auth.user ? 'Ir al Dashboard' : 'Iniciar sesión'}
                            <ArrowRight className="btn-arrow h-4 w-4" />
                        </Link>
                    </div>
                </main>

                {/* ── Module strip ─────────────────────────────────────────── */}
                <ul className="welcome-animate welcome-d6 relative z-10 grid grid-cols-2 border-t border-[rgba(var(--brand-primary-rgb),0.18)] bg-white/40 backdrop-blur-sm sm:grid-cols-4">
                    {FEATURES.map(({ icon: Icon, label }, index) => (
                        <li
                            key={label}
                            className="flex items-center justify-center gap-3 border-b border-[rgba(var(--brand-primary-rgb),0.18)] px-4 py-6 odd:border-r sm:border-r sm:border-b-0 sm:last:border-r-0"
                        >
                            <span className="text-xs font-medium tabular-nums" style={{ color: 'oklch(0.6 0.02 30)' }}>
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <span
                                className="flex h-9 w-9 items-center justify-center rounded-lg"
                                style={{ background: 'rgba(var(--brand-primary-rgb), 0.09)', color: 'var(--brand-primary)' }}
                            >
                                <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="text-sm font-medium" style={{ color: 'oklch(0.28 0.02 30)' }}>
                                {label}
                            </span>
                        </li>
                    ))}
                </ul>

                <p
                    className="welcome-animate welcome-d7 relative z-10 border-t border-[rgba(var(--brand-primary-rgb),0.12)] bg-white/40 py-5 text-center text-xs backdrop-blur-sm"
                    style={{ color: 'oklch(0.6 0.02 30)' }}
                >
                    <AllRightsReserved />
                </p>
            </div>
        </>
    );
}
