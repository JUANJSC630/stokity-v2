import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useState } from 'react';

interface Product {
  id: number;
  name: string;
  code: string;
  stock: number;
  category: {
    id: number;
    name: string;
  };
  branch: {
    id: number;
    name: string;
  };
}

interface Branch {
  id: number;
  name: string;
}

interface Props {
  products: Product[];
  branches: Branch[];
  selectedProduct?: Product | null;
  userBranchId: number | null;
}

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Movimientos de Stock',
    href: '/stock-movements',
  },
  {
    title: 'Nuevo Movimiento',
    href: '/stock-movements/create',
  },
];

export default function StockMovementCreate({ products, selectedProduct }: Props) {

  const [selectedProductData, setSelectedProductData] = useState<Product | null>(selectedProduct || null);
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment'>('in');

  const { data, setData, post, processing, errors } = useForm({
    product_id: selectedProduct?.id || '',
    type: 'in' as 'in' | 'out' | 'adjustment',
    quantity: '',
    unit_cost: '',
    reference: '',
    notes: '',
    movement_date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/stock-movements');
  };

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id.toString() === productId);
    setSelectedProductData(product || null);
    setData('product_id', productId);
  };

  const handleTypeChange = (type: 'in' | 'out' | 'adjustment') => {
    setMovementType(type);
    setData('type', type);
  };

  const getQuantityLabel = () => {
    switch (movementType) {
      case 'in':
        return 'Cantidad a ingresar';
      case 'out':
        return 'Cantidad a retirar';
      case 'adjustment':
        return 'Nuevo stock total';
      default:
        return 'Cantidad';
    }
  };

  const getQuantityHelp = () => {
    if (!selectedProductData) return '';
    
    const currentStock = selectedProductData.stock || 0;
    
    switch (movementType) {
      case 'in':
        return `Stock actual: ${currentStock.toLocaleString()}`;
      case 'out':
        return `Stock disponible: ${currentStock.toLocaleString()}`;
      case 'adjustment':
        return `Stock actual: ${currentStock.toLocaleString()}`;
      default:
        return '';
    }
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Nuevo Movimiento de Stock" />
      
      <div className="flex h-full flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Nuevo Movimiento de Stock</h1>
          <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información del Movimiento</CardTitle>
            <CardDescription>Complete los datos del movimiento de stock</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Producto */}
              <div>
                <Label htmlFor="product_id">Producto *</Label>
                <Select value={data.product_id.toString()} onValueChange={handleProductChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.code} - {product.name} (Stock: {product.stock.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                </Select>
                {errors.product_id && (
                  <p className="text-sm text-red-600 mt-1">{errors.product_id}</p>
                )}
              </div>

              {/* Información del producto seleccionado */}
              {selectedProductData && (
                <Card className="bg-neutral-50 dark:bg-neutral-800">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Código</Label>
                        <p className="text-sm text-neutral-900 dark:text-neutral-100">{selectedProductData.code}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Categoría</Label>
                        <p className="text-sm text-neutral-900 dark:text-neutral-100">{selectedProductData.category?.name || 'Sin categoría'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Sucursal</Label>
                        <p className="text-sm text-neutral-900 dark:text-neutral-100">{selectedProductData.branch?.name || 'Sin sucursal'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Stock Actual</Label>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{selectedProductData.stock?.toLocaleString() || '0'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tipo de movimiento */}
              <div>
                <Label htmlFor="type">Tipo de Movimiento *</Label>
                <Select value={data.type} onValueChange={handleTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Entrada de Stock</SelectItem>
                    <SelectItem value="out">Salida de Stock</SelectItem>
                    <SelectItem value="adjustment">Ajuste de Stock</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-sm text-red-600 mt-1">{errors.type}</p>
                )}
              </div>

              {/* Cantidad */}
              <div>
                <Label htmlFor="quantity">{getQuantityLabel()} *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={data.quantity}
                  onChange={(e) => setData('quantity', e.target.value)}
                  placeholder="Ingrese la cantidad"
                />
                {getQuantityHelp() && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{getQuantityHelp()}</p>
                )}
                {errors.quantity && (
                  <p className="text-sm text-red-600 mt-1">{errors.quantity}</p>
                )}
              </div>

              {/* Costo unitario (solo para entradas) */}
              {movementType === 'in' && (
                <div>
                  <Label htmlFor="unit_cost">Costo Unitario</Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={data.unit_cost}
                    onChange={(e) => setData('unit_cost', e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Precio de compra por unidad (opcional)
                  </p>
                  {errors.unit_cost && (
                    <p className="text-sm text-red-600 mt-1">{errors.unit_cost}</p>
                  )}
                </div>
              )}

              {/* Referencia */}
              <div>
                <Label htmlFor="reference">Referencia</Label>
                <Input
                  id="reference"
                  value={data.reference}
                  onChange={(e) => setData('reference', e.target.value)}
                  placeholder="Ej: Compra proveedor XYZ, Ajuste inventario, etc."
                />
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  Motivo o referencia del movimiento
                </p>
                {errors.reference && (
                  <p className="text-sm text-red-600 mt-1">{errors.reference}</p>
                )}
              </div>

              {/* Notas */}
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={data.notes}
                  onChange={(e) => setData('notes', e.target.value)}
                  placeholder="Notas adicionales sobre el movimiento..."
                  rows={3}
                />
                {errors.notes && (
                  <p className="text-sm text-red-600 mt-1">{errors.notes}</p>
                )}
              </div>

              {/* Fecha del movimiento */}
              <div>
                <Label htmlFor="movement_date">Fecha del Movimiento *</Label>
                <Input
                  id="movement_date"
                  type="date"
                  value={data.movement_date}
                  onChange={(e) => setData('movement_date', e.target.value)}
                />
                {errors.movement_date && (
                  <p className="text-sm text-red-600 mt-1">{errors.movement_date}</p>
                )}
              </div>

              {/* Botones */}
              <div className="flex gap-2">
                <Button type="submit" disabled={processing}>
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Movimiento
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
} 