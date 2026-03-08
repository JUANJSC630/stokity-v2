import AuthLayoutTemplate from '@/layouts/auth/auth-simple-layout';

export default function AuthLayout({
    children,
    title,
    description,
    backHref,
    ...props
}: {
    children: React.ReactNode;
    title?: string;
    description?: string;
    backHref?: string;
}) {
    return (
        <AuthLayoutTemplate title={title} description={description} backHref={backHref} {...props}>
            {children}
        </AuthLayoutTemplate>
    );
}
