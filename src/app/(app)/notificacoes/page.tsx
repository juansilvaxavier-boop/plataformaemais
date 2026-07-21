import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui";
import { NotificationItem } from "./notification-item";

export default async function NotificacoesPage() {
  const session = await auth();
  const notifications = await prisma.notification.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <PageHeader title="Notificações" description="Lembretes de cursos pendentes, certificados e conquistas." />
      {notifications.length === 0 ? (
        <EmptyState title="Nenhuma notificação por aqui." />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <NotificationItem
              key={n.id}
              id={n.id}
              title={n.title}
              body={n.body}
              read={n.read}
              createdAt={n.createdAt.toISOString()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
