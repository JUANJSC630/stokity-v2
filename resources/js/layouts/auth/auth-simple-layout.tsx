import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    const currentYear = new Date().getFullYear();

    return (
        <div
            className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10 shadow-2xl shadow-black"
            style={{
                background: "url('/plantilla/back.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '20px',
                backgroundColor: '#f7f8fa',
                boxShadow: '20px 20px 60px #bebebe, -20px -20px 60px #ffffff'
            }}
        >
            <div className="w-full max-w-sm">
                <div className="rounded-[1rem] border-0 bg-white p-5 shadow-lg">
                    <div className="mb-4 flex flex-col gap-4">
                        <div className="flex flex-col items-center gap-2">
                            <img src="https://img.icons8.com/color/96/000000/rocket--v1.png" alt="Logo" className="mb-3 w-16" />
                            <h2
                                className="mb-1 text-xl font-bold"
                                style={{
                                    background: 'linear-gradient(90deg, #C850C0, #FFCC70)',
                                    WebkitBackgroundClip: 'text',
                                    color: 'transparent',
                                }}
                            >
                                {title}
                            </h2>
                            <p className="text-center text-sm text-muted-foreground">{description}</p>
                        </div>
                    </div>
                    {children}
                </div>
                <div className="mt-4 text-center">
                    <small className="text-white">© {currentYear} TuApp MegaWow. Todos los derechos reservados.</small>
                </div>
            </div>
        </div>
    );
}
