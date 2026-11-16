import { ImageUpload } from '@/components/image-upload';
import InputError from '@/components/input-error';
import { INPUT_CLASS } from '@/components/sales/form-fields';
import { BrandSubmit, SettingsSection } from '@/components/settings/settings-section';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem, type BusinessSetting } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Link, Store } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

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

    const [showUrlInput, setShowUrlInput] = useState(false);

    const handleLogoUrlChange = (url: string) => {
        form.setData({ ...form.data, logo: null, logo_url: url });
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
                <form onSubmit={submit} className="flex flex-col gap-5">
                    <SettingsSection
                        title="Información del negocio"
                        description="Configura el nombre, logo y datos de contacto que aparecen en el sistema y los recibos"
                    >
                        <div className="flex flex-col gap-3 pb-6">
                            <ImageUpload
                                id="logo"
                                label="Logo del negocio"
                                fit="contain"
                                placeholderIcon={Store}
                                file={form.data.logo}
                                currentUrl={form.data.logo_url.startsWith('http') ? form.data.logo_url : business.logo_url}
                                error={form.errors.logo}
                                onChange={(file) => {
                                    form.clearErrors('logo');
                                    form.setData({ ...form.data, logo: file, logo_url: file ? '' : currentLogoUrl });
                                    if (file) {
                                        setShowUrlInput(false);
                                    }
                                }}
                                actions={
                                    <button
                                        type="button"
                                        onClick={() => setShowUrlInput((v) => !v)}
                                        aria-expanded={showUrlInput}
                                        className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-[var(--brand-primary)] transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] sm:h-10"
                                    >
                                        <Link className="size-4" aria-hidden="true" />
                                        Usar URL
                                    </button>
                                }
                            />
                            {showUrlInput && (
                                <div className="w-full max-w-sm space-y-1">
                                    <label htmlFor="logo_url" className="text-xs font-medium">
                                        URL del logo
                                    </label>
                                    <input
                                        id="logo_url"
                                        placeholder="https://..."
                                        value={form.data.logo_url}
                                        onChange={(e) => handleLogoUrlChange(e.target.value)}
                                        className={INPUT_CLASS}
                                    />
                                    <p className="text-xs text-muted-foreground">Pega la URL de una imagen ya subida al blob</p>
                                    <InputError message={form.errors.logo_url} />
                                </div>
                            )}
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-1.5 sm:col-span-2">
                                <label htmlFor="name" className="text-xs font-medium">
                                    Nombre del negocio
                                </label>
                                <input
                                    id="name"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    required
                                    className={INPUT_CLASS}
                                />
                                <InputError message={form.errors.name} />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="nit" className="text-xs font-medium">
                                    NIT / RUT
                                </label>
                                <input
                                    id="nit"
                                    value={form.data.nit}
                                    onChange={(e) => form.setData('nit', e.target.value)}
                                    placeholder="900.123.456-7"
                                    className={INPUT_CLASS}
                                />
                                <InputError message={form.errors.nit} />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="currency_symbol" className="text-xs font-medium">
                                    Símbolo de moneda
                                </label>
                                <input
                                    id="currency_symbol"
                                    value={form.data.currency_symbol}
                                    onChange={(e) => form.setData('currency_symbol', e.target.value)}
                                    placeholder="$"
                                    className={INPUT_CLASS}
                                />
                                <InputError message={form.errors.currency_symbol} />
                            </div>
                        </div>
                    </SettingsSection>

                    <SettingsSection title="Contacto" description="Dónde pueden encontrarte tus clientes">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <label htmlFor="phone" className="text-xs font-medium">
                                    Teléfono
                                </label>
                                <input
                                    id="phone"
                                    type="tel"
                                    inputMode="tel"
                                    value={form.data.phone}
                                    onChange={(e) => form.setData('phone', e.target.value)}
                                    placeholder="+57 300 000 0000"
                                    className={INPUT_CLASS}
                                />
                                <InputError message={form.errors.phone} />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="email" className="text-xs font-medium">
                                    Correo
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    inputMode="email"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                    placeholder="contacto@negocio.com"
                                    className={INPUT_CLASS}
                                />
                                <InputError message={form.errors.email} />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <label htmlFor="address" className="text-xs font-medium">
                                    Dirección
                                </label>
                                <input
                                    id="address"
                                    value={form.data.address}
                                    onChange={(e) => form.setData('address', e.target.value)}
                                    placeholder="Calle 1 # 2-3, Ciudad"
                                    className={INPUT_CLASS}
                                />
                                <InputError message={form.errors.address} />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <label htmlFor="social_media" className="text-xs font-medium">
                                    Red social
                                </label>
                                <input
                                    id="social_media"
                                    value={form.data.social_media}
                                    onChange={(e) => form.setData('social_media', e.target.value)}
                                    placeholder="@mitienda"
                                    className={INPUT_CLASS}
                                />
                                <InputError message={form.errors.social_media} />
                            </div>
                        </div>
                    </SettingsSection>

                    <SettingsSection title="Configuración de Caja">
                        <div className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-border/60 p-4">
                            <label htmlFor="require_cash_session" className="min-w-0 flex-1 cursor-pointer">
                                <p className="text-sm font-medium">Requerir apertura de caja</p>
                                <p className="text-xs text-muted-foreground">Bloquea el cobro en el POS hasta que el cajero abra una sesión</p>
                            </label>
                            <Switch
                                id="require_cash_session"
                                checked={form.data.require_cash_session}
                                onCheckedChange={(checked) => form.setData('require_cash_session', checked)}
                            />
                        </div>
                    </SettingsSection>

                    <div className="flex sm:justify-end">
                        <BrandSubmit disabled={form.processing}>{form.processing ? 'Guardando...' : 'Guardar'}</BrandSubmit>
                    </div>
                </form>
            </SettingsLayout>
        </AppLayout>
    );
}
