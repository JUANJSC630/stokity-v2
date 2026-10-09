import BrandColors from '@/components/brand-colors';
import AllRightsReserved from '@/components/common/AllRightsReserved';
import { DEFAULT_BRAND_PRIMARY, getReadableTextColor } from '@/lib/brand';
import { type BusinessSetting } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Package, Wallet, Zap } from 'lucide-react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    title?: string;
    description?: string;
    backHref?: string;
}

const BENEFITS = [
    { icon: Zap, title: 'Ventas rápidas', text: 'Cobra en segundos desde el mostrador.' },
    { icon: Package, title: 'Inventario al día', text: 'Controla tus existencias al instante.' },
    { icon: Wallet, title: 'Caja y reportes', text: 'Cierra tus turnos y revisa tus ventas del día.' },
];

export default function AuthSimpleLayout({ children, description, backHref }: PropsWithChildren<AuthLayoutProps>) {
    const { business } = usePage<{ business: BusinessSetting }>().props;

    const logoSrc = business?.logo_url || '/stokity-icon.png';
    const businessName = business?.name || 'Stokity';
    const onPrimary = getReadableTextColor(business?.brand_color || DEFAULT_BRAND_PRIMARY);

    return (
        <>
            <BrandColors />
            <div
                className="auth-light-scope relative min-h-screen text-foreground lg:grid lg:grid-cols-2"
                style={{
                    background: `
                    radial-gradient(ellipse 900px 700px at 88% 5%,  rgba(var(--brand-primary-rgb), 0.10) 0%, transparent 60%),
                    radial-gradient(ellipse 700px 900px at 12% 98%, rgba(var(--brand-secondary-rgb), 0.10) 0%, transparent 60%),
                    radial-gradient(ellipse 500px 500px at 50% 45%, rgba(var(--brand-primary-rgb), 0.04) 0%, transparent 70%),
                    oklch(0.975 0.005 30)
                `,
                }}
            >
                {/* ── Brand panel (large screens) ──────────────────────────────── */}
                <aside
                    className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex xl:p-16"
                    style={{
                        color: onPrimary.hex,
                        background: `
                        radial-gradient(ellipse 620px 520px at 92% 6%, rgba(var(--brand-secondary-rgb), 0.45) 0%, transparent 65%),
                        linear-gradient(to top, rgba(0, 0, 0, 0.26) 0%, rgba(0, 0, 0, 0.1) 45%, transparent 70%),
                        var(--brand-primary)
                    `,
                    }}
                >
                    <div className="welcome-animate welcome-d1 flex items-center gap-4">
                        <div className="flex h-16 max-w-[200px] items-center justify-center rounded-2xl bg-white p-2.5 shadow-lg shadow-black/15">
                            <img
                                src={logoSrc}
                                alt=""
                                className="h-full w-auto max-w-full object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/stokity-icon.png';
                                }}
                            />
                        </div>
                        <span className="font-serif text-2xl font-semibold tracking-tight">{businessName}</span>
                    </div>

                    <div className="flex flex-col gap-10">
                        <h1 className="welcome-animate welcome-d3 max-w-md font-serif text-5xl leading-[1.1] font-semibold tracking-tight text-balance">
                            Tu negocio, en control.
                        </h1>

                        <ul className="flex max-w-md flex-col gap-3">
                            {BENEFITS.map(({ icon: Icon, title, text }, index) => (
                                <li
                                    key={title}
                                    className={`welcome-animate welcome-d${index + 4} flex items-center gap-4 rounded-2xl p-4`}
                                    style={{
                                        background: `rgba(${onPrimary.rgb}, 0.1)`,
                                        border: `1px solid rgba(${onPrimary.rgb}, 0.18)`,
                                    }}
                                >
                                    <span
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                                        style={{ background: `rgba(${onPrimary.rgb}, 0.16)` }}
                                    >
                                        <Icon className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                    <span className="flex flex-col">
                                        <span className="text-sm font-semibold">{title}</span>
                                        <span className="text-sm opacity-80">{text}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>

                {/* ── Form column ──────────────────────────────────────────────── */}
                <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
                    {/* Animated atmosphere orbs */}
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

                    <div className="relative z-10 w-full max-w-[400px]">
                        {backHref && (
                            <Link
                                href={backHref}
                                className="welcome-animate welcome-d1 mb-4 flex min-h-11 items-center gap-1.5 text-sm transition-colors duration-200 hover:text-[var(--brand-primary)]"
                                style={{ color: 'oklch(0.52 0.02 30)' }}
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Volver
                            </Link>
                        )}

                        {/* Logo with pulse rings (small screens) */}
                        <div className="mb-6 flex flex-col items-center text-center lg:hidden">
                            <div
                                className="welcome-animate welcome-d2 relative mb-5 flex items-center justify-center"
                                style={{ width: 96, height: 96 }}
                            >
                                <div className="logo-ring" style={{ width: 102, height: 102, animationDelay: '0s' }} />
                                <div className="logo-ring" style={{ width: 102, height: 102, animationDelay: '1.4s' }} />
                                <img
                                    src={logoSrc}
                                    alt={businessName}
                                    className="relative z-10 rounded-xl object-contain"
                                    style={{ width: 96, height: 96, boxShadow: '0 8px 28px rgba(var(--brand-primary-rgb), 0.15)' }}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/stokity-icon.png';
                                    }}
                                />
                            </div>

                            <h1
                                className="welcome-animate welcome-d3 font-serif font-semibold tracking-tight"
                                style={{ fontSize: 32, lineHeight: 1.2, color: 'oklch(0.22 0.02 30)', letterSpacing: '-0.02em' }}
                            >
                                {businessName}
                            </h1>

                            {description && (
                                <p
                                    className="welcome-animate welcome-d4 mt-2 text-sm leading-relaxed text-balance"
                                    style={{ color: 'oklch(0.52 0.02 30)', maxWidth: 300 }}
                                >
                                    {description}
                                </p>
                            )}
                        </div>

                        {/* Heading (large screens: the brand panel already carries the logo) */}
                        {description && (
                            <p
                                className="welcome-animate welcome-d2 mb-5 hidden font-serif text-3xl leading-tight font-semibold tracking-tight text-balance lg:block"
                                style={{ color: 'oklch(0.22 0.02 30)' }}
                            >
                                {description}
                            </p>
                        )}

                        <div
                            className="welcome-animate welcome-d4 mx-auto mb-7 h-0.5 w-10 rounded-full lg:mx-0"
                            style={{ background: 'var(--brand-primary)' }}
                        />

                        {/* Form content: elevated sheet on small screens, plain on large */}
                        <div className="rounded-2xl bg-white/70 p-6 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/5 backdrop-blur-sm lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0 lg:backdrop-blur-none">
                            {children}
                        </div>

                        <p className="welcome-animate welcome-d8 mt-8 text-center text-xs" style={{ color: 'oklch(0.65 0.02 30)' }}>
                            <AllRightsReserved />
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
