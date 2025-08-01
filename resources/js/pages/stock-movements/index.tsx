import PaginationFooter from '@/components/common/PaginationFooter';
import { Table, type Column } from '@/components/common/Table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, Search, X, Eye } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface StockMovement {
  id: number;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  unit_cost: number | null;
  reference: string | null;
  notes: string | null;
  movement_date: string;
  created_at: string;
  product: {
    id: number;
    name: string;
    code: string;
  };
  user: {
    id: number;
    name: string;
  };
  branch: {
    id: number;
    name: string;
  };
}

interface Props {
  movements: {
    data: StockMovement[];
    links: { label: string; url: string | null }[];
    current_page: number;
    from: number;
    to: number;
    total: number;
    last_page: number;
  };
  branches: Array<{ id: number; name: string }>;
  products: Array<{ id: number; name: string; code: string }>;
  filters: {
    search?: string;
    type?: string;
    branch?: string;
    product?: string;
    start_date?: string;
    end_date?: string;
  };
}

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Movimientos de Stock',
    href: '/stock-movements',
  },
];

export default function StockMovementsIndex({ movements, branches, products, filters }: Props) {
  const [search, setSearch] = useState(filters.search || '');
  const [type, setType] = useState(filters.type || 'all');
  const [branch, setBranch] = useState(filters.branch || 'all');
  const [product, setProduct] = useState(filters.product || 'all');
  const [startDate, setStartDate] = useState(filters.start_date || '');
  const [endDate, setEndDate] = useState(filters.end_date || '');

  const handleFilter = () => {
    const filters = {
      search,
      type: type === 'all' ? '' : type,
      branch: branch === 'all' ? '' : branch,
      product: product === 'all' ? '' : product,
      start_date: startDate,
      end_date: endDate,
    };

    router.get('/stock-movements', filters, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  const clearFilters = () => {
    setSearch('');
    setType('all');
    setBranch('all');
    setProduct('all');
    setStartDate('');
    setEndDate('');
    router.get('/stock-movements');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'in':
        return 'bg-green-100 text-green-800';
      case 'out':
        return 'bg-red-100 text-red-800';
      case 'adjustment':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'in':
        return 'Entrada';
      case 'out':
        return 'Salida';
      case 'adjustment':
        return 'Ajuste';
      default:
        return 'Desconocido';
    }
  };

  const columns: Column<StockMovement>[] = [
    {
      key: 'movement_date',
      title: 'Fecha',
      render: (value) => format(new Date(value as string), 'dd/MM/yyyy HH:mm', { locale: es })
    },
    {
      key: 'product',
      title: 'Producto',
      render: (value, row) => (
        <Link 
          href={`/products/${row.product.id}`}
          className="text-blue-600 hover:text-blue-800"
        >
          {row.product.code} - {row.product.name}
        </Link>
      )
    },
    {
      key: 'type',
      title: 'Tipo',
      render: (value) => (
        <Badge className={getTypeColor(value as string)}>
          {getTypeLabel(value as string)}
        </Badge>
      )
    },
    {
      key: 'quantity',
      title: 'Cantidad',
      render: (value) => <span className="font-medium">{(value as number).toLocaleString()}</span>
    },
    {
      key: 'previous_stock',
      title: 'Stock Anterior',
      render: (value) => (value as number).toLocaleString()
    },
    {
      key: 'new_stock',
      title: 'Stock Nuevo',
      render: (value) => <span className="font-medium">{(value as number).toLocaleString()}</span>
    },
    {
      key: 'unit_cost',
      title: 'Costo Unit.',
      render: (value) => (value ? `$${(value as number).toLocaleString()}` : '-') as React.ReactNode
    },
    {
      key: 'reference',
      title: 'Referencia',
      render: (value) => (value || '-') as React.ReactNode
    },
    {
      key: 'user',
      title: 'Usuario',
      render: (value, row) => row.user.name
    },
    {
      key: 'branch',
      title: 'Sucursal',
      render: (value, row) => row.branch.name
    }
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Movimientos de Stock" />
      
      <div className="flex h-full flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Movimientos de Stock</h1>
          <Link href="/stock-movements/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Movimiento
            </Button>
          </Link>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Búsqueda</label>
                <Input
                  placeholder="Buscar por referencia, notas o producto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="type-filter" className="block text-sm font-medium mb-1">Tipo</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type-filter">
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="in">Entrada</SelectItem>
                    <SelectItem value="out">Salida</SelectItem>
                    <SelectItem value="adjustment">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {branches.length > 0 && (
                <div>
                  <label htmlFor="branch-filter" className="block text-sm font-medium mb-1">Sucursal</label>
                  <Select value={branch} onValueChange={setBranch}>
                    <SelectTrigger id="branch-filter">
                      <SelectValue placeholder="Todas las sucursales" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las sucursales</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label htmlFor="product-filter" className="block text-sm font-medium mb-1">Producto</label>
                <Select value={product} onValueChange={setProduct}>
                  <SelectTrigger id="product-filter">
                    <SelectValue placeholder="Todos los productos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los productos</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.code} - {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha desde</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha hasta</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleFilter}>
                <Search className="mr-2 h-4 w-4" />
                Filtrar
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de movimientos */}
        <Card>
          <CardHeader>
            <CardTitle>Movimientos ({movements.total})</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Vista tabla en md+ */}
            <div className="hidden md:block">
              <Table 
                columns={columns} 
                data={movements.data}
                emptyMessage="No se encontraron movimientos de stock"
              />
            </div>

            {/* Vista tarjetas en móvil */}
            <div className="block md:hidden">
              {movements.data.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">No se encontraron movimientos de stock</div>
              ) : (
                movements.data.map((movement) => (
                  <div
                    key={movement.id}
                    className="mb-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getTypeColor(movement.type)}`}>
                          <span className="text-xs font-medium">
                            {movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : '='}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-neutral-900 dark:text-neutral-100">
                            {movement.product.name}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {movement.product.code}
                          </div>
                        </div>
                      </div>
                      <Badge className={getTypeColor(movement.type)}>
                        {getTypeLabel(movement.type)}
                      </Badge>
                    </div>
                    
                    <div className="mb-2 space-y-1">
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Cantidad: <span className="font-medium text-neutral-700 dark:text-neutral-200">{movement.quantity.toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Stock anterior: <span className="font-medium text-neutral-700 dark:text-neutral-200">{movement.previous_stock.toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Stock nuevo: <span className="font-medium text-neutral-700 dark:text-neutral-200">{movement.new_stock.toLocaleString()}</span>
                      </div>
                      {movement.unit_cost && (
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          Costo unitario: <span className="font-medium text-neutral-700 dark:text-neutral-200">${movement.unit_cost.toLocaleString()}</span>
                        </div>
                      )}
                      {movement.reference && (
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          Referencia: <span className="font-medium text-neutral-700 dark:text-neutral-200">{movement.reference}</span>
                        </div>
                      )}
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Fecha: <span className="font-medium text-neutral-700 dark:text-neutral-200">
                          {format(new Date(movement.movement_date), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Usuario: <span className="font-medium text-neutral-700 dark:text-neutral-200">{movement.user.name}</span>
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Sucursal: <span className="font-medium text-neutral-700 dark:text-neutral-200">{movement.branch.name}</span>
                      </div>
                    </div>

                    {movement.notes && (
                      <div className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                        <div className="font-medium mb-1">Notas:</div>
                        <div className="bg-neutral-50 p-2 rounded dark:bg-neutral-800">
                          {movement.notes}
                        </div>
                      </div>
                    )}

                    <div className="mt-2 flex justify-end gap-2">
                      <Link href={`/products/${movement.product.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver producto">
                          <Eye className="h-4 w-4 text-neutral-700 dark:text-neutral-200" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            <PaginationFooter data={{
              ...movements,
              data: movements.data,
              links: movements.links
            }} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
} 