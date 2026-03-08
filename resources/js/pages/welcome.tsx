import AllRightsReserved from '@/components/common/AllRightsReserved';
import { type BusinessSetting, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, BarChart2, Package, ShoppingCart, Wallet } from 'lucide-react';

const FEATURES = [
    { icon: ShoppingCart, label: 'Ventas' },
    { icon: Package,      label: 'Inventario' },
    { icon: Wallet,       label: 'Caja' },
    { icon: BarChart2,    label: 'Reportes' },
];

export default function Welcome() {
    const { auth, business } = usePage<SharedData & { business: BusinessSetting }>().props;

    const logoSrc    = business?.logo_url || '/stokity-icon.png';
    const businessName = business?.name   || 'Stokity';

    return (
        <>
            <Head title={`Bienvenido — ${businessName}`} />

            {/* Full-bleed canvas */}
            <div
                className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16"
                style={{
                    background: `
                        radial-gradient(ellipse 900px 700px at 88% 5%,  rgba(199,91,122,0.10) 0%, transparent 60%),
                        radial-gradient(ellipse 700px 900px at 12% 98%, rgba(232,153,141,0.10) 0%, transparent 60%),
                        radial-gradient(ellipse 500px 500px at 50% 45%, rgba(199,91,122,0.04) 0%, transparent 70%),
                        oklch(0.975 0.005 30)
                    `,
                }}
            >
                {/* ── Animated atmosphere orbs ─────────────────────────────── */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div
                        className="absolute -top-16 -right-16 h-[460px] w-[460px] rounded-full blur-[90px]"
                        style={{ background: 'rgba(199,91,122,0.13)', animation: 'orb-drift-1 14s ease-in-out infinite' }}
                    />
                    <div
                        className="absolute -bottom-20 -left-20 h-[520px] w-[520px] rounded-full blur-[110px]"
                        style={{ background: 'rgba(232,153,141,0.13)', animation: 'orb-drift-2 18s ease-in-out infinite' }}
                    />
                    <div
                        className="absolute top-1/3 right-1/4 h-64 w-64 rounded-full blur-[70px]"
                        style={{ background: 'rgba(199,91,122,0.06)', animation: 'orb-drift-1 10s ease-in-out infinite reverse' }}
                    />
                </div>

                {/* ── Content ──────────────────────────────────────────────── */}
                <div className="relative z-10 flex max-w-lg flex-col items-center text-center">

                    {/* Badge */}
                    <div
                        className="welcome-animate welcome-d1 mb-10 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-widest"
                        style={{ background: 'rgba(199,91,122,0.09)', color: '#C75B7A', border: '1px solid rgba(199,91,122,0.2)' }}
                    >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#C75B7A' }} />
                        Sistema de Gestión POS
                    </div>

                    {/* Logo with pulse rings */}
                    <div className="welcome-animate welcome-d2 relative mb-7 flex items-center justify-center" style={{ width: 128, height: 128 }}>
                        <div className="logo-ring" style={{ width: 134, height: 134, animationDelay: '0s'   }} />
                        <div className="logo-ring" style={{ width: 134, height: 134, animationDelay: '0.93s' }} />
                        <div className="logo-ring" style={{ width: 134, height: 134, animationDelay: '1.86s' }} />
                        <img
                            src={logoSrc}
                            alt={businessName}
                            className="relative z-10 rounded-2xl object-contain"
                            style={{ width: 128, height: 128, boxShadow: '0 12px 40px rgba(199,91,122,0.18)' }}
                            onError={(e) => { (e.target as HTMLImageElement).src = '/stokity-icon.png'; }}
                        />
                    </div>

                    {/* Business name */}
                    <h1
                        className="welcome-animate welcome-d3 font-serif font-semibold tracking-tight"
                        style={{ fontSize: 'clamp(36px, 7vw, 52px)', lineHeight: 1.15, color: 'oklch(0.22 0.02 30)', letterSpacing: '-0.02em' }}
                    >
                        {businessName}
                    </h1>

                    {/* Accent line */}
                    <div
                        className="welcome-animate welcome-d4 my-5 h-0.5 w-12 rounded-full"
                        style={{ background: 'linear-gradient(to right, #C75B7A, #E8998D)' }}
                    />

                    {/* Tagline */}
                    <p
                        className="welcome-animate welcome-d4 text-balance leading-relaxed"
                        style={{ fontSize: 16, color: 'oklch(0.5 0.02 30)', maxWidth: 340, margin: '0 auto 36px' }}
                    >
                        Tu punto de venta profesional, listo para crecer con tu negocio
                    </p>

                    {/* Feature chips */}
                    <div className="welcome-animate welcome-d5 mb-10 flex flex-wrap justify-center gap-2">
                        {FEATURES.map(({ icon: Icon, label }) => (
                            <div key={label} className="welcome-chip flex items-center gap-1.5">
                                <Icon style={{ width: 12, height: 12 }} />
                                {label}
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="welcome-animate welcome-d6">
                        <Link
                            href={auth.user ? route('dashboard') : route('login')}
                            className="btn-auth group"
                            style={{ width: 'auto', paddingLeft: '2.5rem', paddingRight: '2.5rem', fontSize: '1rem' }}
                        >
                            {auth.user ? 'Ir al Dashboard' : 'Iniciar sesión'}
                            <ArrowRight className="btn-arrow h-4 w-4" />
                        </Link>
                    </div>
                </div>

                {/* Copyright */}
                <p
                    className="welcome-animate welcome-d7 absolute bottom-6 left-0 right-0 text-center text-xs"
                    style={{ color: 'oklch(0.65 0.02 30)' }}
                >
                    <AllRightsReserved />
                </p>
            </div>
        </>
    );
}
