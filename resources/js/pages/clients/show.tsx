import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/layouts/app-layout";
import { type BreadcrumbItem } from "@/types";
import { Head, Link, router } from "@inertiajs/react";
import { ChevronLeft, Edit } from "lucide-react";
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
  created_at: string;
  updated_at: string;
}

interface Props {
  client: Client;
}

export default function Show({ client }: Props) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const breadcrumbs: BreadcrumbItem[] = [
    {
      title: "Clientes",
      href: "/clients",
    },
    {
      title: client.name,
      href: `/clients/${client.id}`,
    },
  ];

  function handleDelete() {
    router.delete(route("clients.destroy", client.id));
    setIsDeleteDialogOpen(false);
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Cliente: ${client.name}`} />
      <div className="flex h-full flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <Link href={route("clients.index")}>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ChevronLeft className="size-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{client.name}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información del Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Nombre</dt>
                <dd className="mt-1 text-lg">{client.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Documento</dt>
                <dd className="mt-1 text-lg">{client.document}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Teléfono</dt>
                <dd className="mt-1 text-lg">{client.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Correo Electrónico</dt>
                <dd className="mt-1 text-lg">{client.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Dirección</dt>
                <dd className="mt-1 text-lg">{client.address || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</dt>
                <dd className="mt-1 text-lg">
                  {client.birthdate ? new Date(client.birthdate).toLocaleDateString() : "—"}
                </dd>
              </div>
            </dl>
          </CardContent>
          <CardFooter className="flex flex-col md:flex-row md:justify-between border-t px-6 py-4 gap-4 md:gap-0">
            <div className="text-sm text-muted-foreground">
              <p>Creado: {new Date(client.created_at).toLocaleDateString()}</p>
              <p>Última actualización: {new Date(client.updated_at).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2 self-end md:self-center">
              <Link href={route("clients.edit", client.id)}>
                <Button variant="outline" className="flex gap-1">
                  <Edit className="size-4" />
                  <span>Editar</span>
                </Button>
              </Link>
            </div>
          </CardFooter>
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
