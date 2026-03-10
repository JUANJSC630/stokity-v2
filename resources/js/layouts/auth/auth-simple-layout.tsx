import AllRightsReserved from '@/components/common/AllRightsReserved';
import { type BusinessSetting } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    title?: string;
    description?: string;
    backHref?: string;
}

export default function AuthSimpleLayout({ children, description, backHref }: PropsWithChildren<AuthLayoutProps>) {
    const { business } = usePage<{ business: BusinessSetting }>().props;

    const logoSrc = business?.logo_url || '/stokity-icon.png';
    const businessName = business?.name || 'Stokity';

    return (
        <div
            className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12"
            style={{
                background: `
                    radial-gradient(ellipse 900px 700px at 88% 5%,  rgba(199,91,122,0.10) 0%, transparent 60%),
                    radial-gradient(ellipse 700px 900px at 12% 98%, rgba(232,153,141,0.10) 0%, transparent 60%),
                    radial-gradient(ellipse 500px 500px at 50% 45%, rgba(199,91,122,0.04) 0%, transparent 70%),
                    oklch(0.975 0.005 30)
                `,
            }}
        >
            {/* ── Animated atmosphere orbs ─────────────────────────────────── */}
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

            {/* ── Content (no card — same as welcome) ──────────────────────── */}
            <div className="relative z-10 w-full max-w-[400px]">
                {/* Back link */}
                {backHref && (
                    <Link
                        href={backHref}
                        className="welcome-animate welcome-d1 mb-8 flex items-center gap-1.5 text-sm transition-colors duration-200 hover:text-[#C75B7A]"
                        style={{ color: 'oklch(0.52 0.02 30)' }}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver
                    </Link>
                )}

                {/* Logo with pulse rings */}
                <div className="mb-6 flex flex-col items-center text-center">
                    <div className="welcome-animate welcome-d2 relative mb-5 flex items-center justify-center" style={{ width: 96, height: 96 }}>
                        <div className="logo-ring" style={{ width: 102, height: 102, animationDelay: '0s' }} />
                        <div className="logo-ring" style={{ width: 102, height: 102, animationDelay: '1.4s' }} />
                        <img
                            src={logoSrc}
                            alt={businessName}
                            className="relative z-10 rounded-xl object-contain"
                            style={{ width: 96, height: 96, boxShadow: '0 8px 28px rgba(199,91,122,0.15)' }}
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

                {/* Divider accent */}
                <div
                    className="welcome-animate welcome-d4 mx-auto mb-7 h-0.5 w-10 rounded-full"
                    style={{ background: 'linear-gradient(to right, #C75B7A, #E8998D)' }}
                />

                {/* Form content */}
                {children}

                {/* Copyright */}
                <p className="welcome-animate welcome-d8 mt-8 text-center text-xs" style={{ color: 'oklch(0.65 0.02 30)' }}>
                    <AllRightsReserved />
                </p>
            </div>
        </div>
    );
}
