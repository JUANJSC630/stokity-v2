import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Product } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Edit2 } from 'lucide-react';
import QRCode from 'react-qr-code';

interface ProductShowProps {
    product: Product;
}

export default function ProductShow({ product }: ProductShowProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Productos',
            href: '/products',
        },
        {
            title: product.name,
            href: `/products/${product.id}`,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Producto: ${product.name}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Detalles del Producto</h1>
                    <div className="flex gap-2">
                        <Link href="/products">
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <ArrowLeft className="h-4 w-4" />
                                Volver
                            </Button>
                        </Link>
                        <Link href={`/products/${product.id}/edit`}>
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <Edit2 className="h-4 w-4" />
                                Editar
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {/* Imagen y estado */}
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle>Imagen</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4">
                            <div className="aspect-square w-full overflow-hidden rounded-md bg-gray-100">
                                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                            </div>

                            <div className="flex w-full flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-neutral-500 dark:text-neutral-400">Estado:</span>
                                    {product.status ? (
                                        <Badge
                                            variant="default"
                                            className="bg-green-100 text-xs text-green-800 dark:bg-green-900 dark:text-green-200"
                                        >
                                            Activo
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                            Inactivo
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex flex-col justify-start py-2">
                                    <div className="flex flex-col items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Código:</span>
                                        <span className="font-medium">{product.code}</span>
                                    </div>
                                    <div className="flex justify-center py-2">
                                        <QRCode
                                            value={product.code}
                                            size={100}
                                            style={{ height: 'auto', maxWidth: 80, width: '100%' }}
                                            viewBox={`0 0 256 256`}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Categoría:</span>
                                    <span className="font-medium">{product.category?.name}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Sucursal:</span>
                                    <span className="font-medium">{product.branch?.name}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Información general */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>{product.name}</CardTitle>
                            <CardDescription>Información detallada del producto</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Precios */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-md bg-neutral-50 p-4 dark:bg-neutral-800">
                                    <div className="text-sm text-neutral-500 dark:text-neutral-400">Precio de compra</div>
                                    <div className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                                        $
                                        {Number(product.purchase_price).toLocaleString('es-CO', {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 0,
                                        })}
                                    </div>
                                </div>
                                <div className="rounded-md bg-neutral-50 p-4 dark:bg-neutral-800">
                                    <div className="text-sm text-neutral-500 dark:text-neutral-400">Precio de venta</div>
                                    <div className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                                        $
                                        {Number(product.sale_price).toLocaleString('es-CO', {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 0,
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Inventario */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-md bg-neutral-50 p-4 dark:bg-neutral-800">
                                    <div className="text-sm text-neutral-500 dark:text-neutral-400">Stock actual</div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{product.stock}</span>
                                        {product.stock <= product.min_stock && <Badge variant="destructive">Bajo</Badge>}
                                    </div>
                                </div>
                                <div className="rounded-md bg-neutral-50 p-4 dark:bg-neutral-800">
                                    <div className="text-sm text-neutral-500 dark:text-neutral-400">Stock mínimo</div>
                                    <div className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{product.min_stock}</div>
                                </div>
                            </div>

                            {/* Descripción */}
                            <div>
                                <h3 className="mb-2 text-lg font-medium text-neutral-900 dark:text-neutral-100">Descripción</h3>
                                <div className="min-h-[100px] rounded-md bg-neutral-50 p-4 whitespace-pre-wrap dark:bg-neutral-800 dark:text-neutral-100">
                                    {product.description || 'Sin descripción'}
                                </div>
                            </div>

                            {/* Fechas */}
                            <div className="grid grid-cols-2 gap-4 border-t pt-4 dark:border-neutral-700">
                                <div>
                                    <div className="text-sm text-neutral-500 dark:text-neutral-400">Creado</div>
                                    <div className="text-neutral-900 dark:text-neutral-100">{new Date(product.created_at).toLocaleDateString()}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-neutral-500 dark:text-neutral-400">Actualizado</div>
                                    <div className="text-neutral-900 dark:text-neutral-100">{new Date(product.updated_at).toLocaleDateString()}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
