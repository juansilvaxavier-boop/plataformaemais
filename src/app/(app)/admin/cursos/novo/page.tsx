import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { PageHeader, Card, Button, Input, Label, Textarea } from "@/components/ui";
import { UploadOrUrlField } from "@/components/upload-field";
import { createCourse } from "../actions";

export default async function NovoCursoPage() {
  const session = await auth();
  assertRole(session?.user?.role, "INSTRUCTOR");

  return (
    <div>
      <PageHeader title="Novo curso" />
      <Card className="max-w-2xl">
        <form action={createCourse} className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input name="title" required />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea name="description" rows={4} required />
          </div>
          <div>
            <Label>Categoria</Label>
            <Input name="category" placeholder="Ex.: Compliance, Liderança, Produto" required />
          </div>
          <div>
            <Label>Período de recertificação (meses, opcional)</Label>
            <Input name="recertificationPeriodMonths" type="number" min={1} placeholder="Ex.: 12" />
          </div>
          <div>
            <Label>Imagem de capa (opcional)</Label>
            <UploadOrUrlField name="coverUrl" placeholder="https://.../capa.jpg" />
          </div>
          <Button type="submit">Criar e continuar</Button>
        </form>
      </Card>
    </div>
  );
}
