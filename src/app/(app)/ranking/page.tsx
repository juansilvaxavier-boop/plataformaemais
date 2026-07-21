import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge } from "@/components/ui";
import { getLeaderboard } from "@/lib/gamification";
import { Trophy } from "lucide-react";

export default async function RankingPage() {
  const session = await auth();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session!.user.id } });

  const [global, departmentBoard] = await Promise.all([
    getLeaderboard({ limit: 15 }),
    user.departmentId ? getLeaderboard({ departmentId: user.departmentId, limit: 15 }) : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader title="Ranking" description="Competição saudável entre colaboradores, equipes e filiais." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" /> Ranking Geral
          </h3>
          <LeaderboardTable entries={global} currentUserId={session!.user.id} />
        </Card>

        {user.departmentId && (
          <Card>
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-indigo-500" /> Ranking do Departamento
            </h3>
            <LeaderboardTable entries={departmentBoard} currentUserId={session!.user.id} />
          </Card>
        )}
      </div>
    </div>
  );
}

function LeaderboardTable({
  entries,
  currentUserId,
}: {
  entries: { userId: string; name: string; department: string; totalPoints: number }[];
  currentUserId: string;
}) {
  return (
    <ol className="space-y-2">
      {entries.map((e, idx) => (
        <li
          key={e.userId}
          className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${
            e.userId === currentUserId ? "bg-indigo-50 border border-indigo-200" : "bg-slate-50"
          }`}
        >
          <span className="flex items-center gap-3">
            <span className="w-5 text-center font-semibold text-slate-400">{idx + 1}</span>
            {e.name}
          </span>
          <Badge tone="info">{e.totalPoints} pts</Badge>
        </li>
      ))}
      {entries.length === 0 && <p className="text-sm text-slate-400">Sem dados suficientes ainda.</p>}
    </ol>
  );
}
