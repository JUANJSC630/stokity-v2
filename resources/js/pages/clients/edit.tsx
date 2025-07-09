import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppLayout from "@/layouts/app-layout";
import { type BreadcrumbItem } from "@/types";
import { Head, Link, useForm, router } from "@inertiajs/react";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Client {
  id: number;
  name: string;
  document: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  birthdate: string | null;
}

interface Props {
  client: Client;
}

export default function Edit({ client }: Props) {
  const breadcrumbs: BreadcrumbItem[] = [
    {
      title: "Clientes",
      href: "/clients",
    },
    {
      title: client.name,
      href: `/clients/${client.id}`,
    },
    {
      title: "Editar",
      href: `/clients/${client.id}/edit`,
    },
  ];

  const form = useForm({
    name: client.name,
    document: client.document,
    phone: client.phone || "",
    address: client.address || "",
    email: client.email || "",
    birthdate: client.birthdate || "",
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    form.put(route("clients.update", client.id));
  }

  function handleDelete() {
    router.delete(route("clients.destroy", client.id));
    setIsDeleteDialogOpen(false);
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Editar Cliente: ${client.name}`} />
      <div className="flex h-full flex-1 flex-col gap-4 p-2 sm:p-4">
        {/* Header with back button */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0">
          <Link href={route("clients.index")}> 
            <Button variant="ghost" size="sm" className="mr-0 sm:mr-4 flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold">Editar Cliente</h1>
        </div>

        <Card className="border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
          <CardHeader>
            <CardTitle>Información del Cliente</CardTitle>
            <CardDescription>
              Modifica los datos necesarios del cliente. Todos los campos marcados con * son obligatorios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    type="text"
                    className="bg-white text-black dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.data.name}
                    onChange={(e) => form.setData("name", e.target.value)}
                    required
                  />
                  {form.errors.name && <p className="text-sm text-red-500">{form.errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="document">Documento <span className="text-red-500">*</span></Label>
                  <Input
                    id="document"
                    type="text"
                    className="bg-white text-black dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.data.document}
                    onChange={(e) => form.setData("document", e.target.value)}
                    placeholder="Cédula de Ciudadanía"
                    required
                  />
                  {form.errors.document && <p className="text-sm text-red-500">{form.errors.document}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    className="bg-white text-black dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.data.phone}
                    onChange={(e) => form.setData("phone", e.target.value)}
                  />
                  {form.errors.phone && <p className="text-sm text-red-500">{form.errors.phone}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    className="bg-white text-black dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.data.email}
                    onChange={(e) => form.setData("email", e.target.value)}
                  />
                  {form.errors.email && <p className="text-sm text-red-500">{form.errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    type="text"
                    className="max-w-full truncate bg-white text-black dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.data.address}
                    onChange={(e) => form.setData("address", e.target.value)}
                  />
                  {form.errors.address && <p className="text-sm text-red-500">{form.errors.address}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthdate">Fecha de Nacimiento</Label>
                  <Input
                    id="birthdate"
                    type="date"
                    className="bg-white text-black dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.data.birthdate ? form.data.birthdate.slice(0, 10) : ''}
                    onChange={(e) => form.setData("birthdate", e.target.value)}
                  />
                  {form.errors.birthdate && <p className="text-sm text-red-500">{form.errors.birthdate}</p>}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2 sm:gap-0 mt-4">
                <Link href={route("clients.index")}> 
                  <Button variant="outline" type="button" className="w-full sm:w-auto">
                    Cancelar
                  </Button>
                </Link>
                <Button type="submit" disabled={form.processing} className="gap-1 w-full sm:w-auto">
                  <Save className="size-4" />
                  <span>Actualizar Cliente</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1 text-red-500 hover:text-red-600 w-full sm:w-auto"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="size-4" />
                  <span>Eliminar</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Cliente</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar a {client.name}? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
