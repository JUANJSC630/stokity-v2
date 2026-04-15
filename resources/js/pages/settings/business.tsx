import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem, type BusinessSetting } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Camera, Link } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Negocio', href: '/settings/business' }];

export default function BusinessSettings({ business }: { business: BusinessSetting }) {
    // Current blob URL (if already stored) — used as the default logo_url value
    const currentLogoUrl = business.logo?.startsWith('http') ? business.logo : '';

    const form = useForm({
        name: business.name,
        nit: business.nit ?? '',
        phone: business.phone ?? '',
        email: business.email ?? '',
        address: business.address ?? '',
        social_media: business.social_media ?? '',
        currency_symbol: business.currency_symbol ?? '$',
        require_cash_session: business.require_cash_session ?? false,
        logo: null as File | null,
        logo_url: currentLogoUrl,
        _method: 'POST',
    });

    const { props } = usePage<{ flash: { success?: string } }>();

    useEffect(() => {
        if (props.flash?.success) {
            toast.success(props.flash.success);
        }
    }, [props.flash?.success]);

    const [logoPreview, setLogoPreview] = useState<string>(business.logo_url);
    const [showUrlInput, setShowUrlInput] = useState(false);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (!file) return;
        // File upload takes priority — clear any URL
        form.setData({ ...form.data, logo: file, logo_url: '' });
        const reader = new FileReader();
        reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
        setShowUrlInput(false);
    };

    const handleLogoUrlChange = (url: string) => {
        form.setData({ ...form.data, logo: null, logo_url: url });
        if (url.startsWith('http')) {
            setLogoPreview(url);
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('settings.business.update'), {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Configuración del negocio" />
            <SettingsLayout>
                <div className="mx-auto max-w-lg space-y-8">
                    <HeadingSmall
                        title="Información del negocio"
                        description="Configura el nombre, logo y datos de contacto que aparecen en el sistema y los recibos"
                    />

                    <div className="flex flex-col items-center gap-3 pb-2">
                        <div className="relative">
                            <img
                                src={logoPreview}
                                alt="Logo del negocio"
                                className="h-24 w-24 rounded-lg border-2 border-neutral-200 bg-white object-contain shadow dark:border-neutral-700"
                            />
                            <label
                                htmlFor="logo"
                                className="absolute right-1 bottom-1 flex cursor-pointer items-center justify-center rounded-full border-2 border-white bg-primary p-2 text-white shadow-lg transition-colors hover:bg-primary/90 dark:border-neutral-900 dark:text-black"
                                style={{ width: 38, height: 38 }}
                            >
                                <Camera className="h-5 w-5" />
                                <input id="logo" type="file" accept="image/*" className="sr-only" onChange={handleLogoChange} />
                            </label>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">JPG, PNG. Máx 2MB</span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <button
                                type="button"
                                onClick={() => setShowUrlInput((v) => !v)}
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                                <Link className="h-3 w-3" />
                                Usar URL
                            </button>
                        </div>
                        {showUrlInput && (
                            <div className="w-full max-w-xs space-y-1">
                                <Input
                                    placeholder="https://..."
                                    value={form.data.logo_url}
                                    onChange={(e) => handleLogoUrlChange(e.target.value)}
                                    className="text-xs"
                                />
                                <p className="text-xs text-muted-foreground">Pega la URL de una imagen ya subida al blob</p>
                                <InputError message={form.errors.logo_url} />
                            </div>
                        )}
                        <InputError message={form.errors.logo} />
                    </div>

                    <form onSubmit={submit} className="space-y-5">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre del negocio</Label>
                            <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                            <InputError message={form.errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="nit">NIT / RUT</Label>
                            <Input id="nit" value={form.data.nit} onChange={(e) => form.setData('nit', e.target.value)} placeholder="900.123.456-7" />
                            <InputError message={form.errors.nit} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input
                                id="phone"
                                value={form.data.phone}
                                onChange={(e) => form.setData('phone', e.target.value)}
                                placeholder="+57 300 000 0000"
                            />
                            <InputError message={form.errors.phone} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Correo</Label>
                            <Input
                                id="email"
                                type="email"
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                placeholder="contacto@negocio.com"
                            />
                            <InputError message={form.errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="address">Dirección</Label>
                            <Input
                                id="address"
                                value={form.data.address}
                                onChange={(e) => form.setData('address', e.target.value)}
                                placeholder="Calle 1 # 2-3, Ciudad"
                            />
                            <InputError message={form.errors.address} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="social_media">Red social</Label>
                            <Input
                                id="social_media"
                                value={form.data.social_media}
                                onChange={(e) => form.setData('social_media', e.target.value)}
                                placeholder="@mitienda"
                            />
                            <InputError message={form.errors.social_media} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="currency_symbol">Símbolo de moneda</Label>
                            <Input
                                id="currency_symbol"
                                value={form.data.currency_symbol}
                                onChange={(e) => form.setData('currency_symbol', e.target.value)}
                                placeholder="$"
                                className="max-w-24"
                            />
                            <InputError message={form.errors.currency_symbol} />
                        </div>

                        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
                            <p className="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">Configuración de Caja</p>
                            <label className="flex cursor-pointer items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium">Requerir apertura de caja</p>
                                    <p className="text-xs text-muted-foreground">Bloquea el cobro en el POS hasta que el cajero abra una sesión</p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={form.data.require_cash_session}
                                    onClick={() => form.setData('require_cash_session', !form.data.require_cash_session)}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:outline-none ${form.data.require_cash_session ? 'bg-orange-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${form.data.require_cash_session ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </label>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button disabled={form.processing}>
                                {form.processing ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
