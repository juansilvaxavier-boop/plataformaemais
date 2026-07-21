import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { PageHeader, Card, Badge } from "@/components/ui";
import { BI_DATASETS } from "@/lib/powerbi";
import { Database, Globe } from "lucide-react";

function parseConnectionInfo() {
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    return {
      host: url.hostname,
      port: url.port || "5432",
      database: url.pathname.replace(/^\//, ""),
      user: url.username,
    };
  } catch {
    return null;
  }
}

export default async function PowerBiPage() {
  const session = await auth();
  assertRole(session?.user?.role, "ADMIN");

  const conn = parseConnectionInfo();
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const apiKeyConfigured = Boolean(process.env.POWERBI_API_KEY);

  return (
    <div>
      <PageHeader
        title="Integração direta com Power BI"
        description="Duas formas de conectar dashboards do Power BI diretamente aos dados da plataforma, sem exportação manual de arquivos."
      />

      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Database size={20} className="text-indigo-600" />
          <h3 className="font-semibold text-slate-800">
            Opção 1 — Conector nativo PostgreSQL (recomendado)
          </h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          No Power BI Desktop: <strong>Obter Dados → Banco de Dados PostgreSQL</strong>. As views abaixo
          (prefixo <code className="bg-slate-100 px-1 rounded">vw_bi_</code>) aparecem no navegador de
          dados como tabelas comuns, já achatadas para relatórios — sem etapa de exportação. Use uma role
          somente leitura em produção e, se o Power BI Service estiver na nuvem sem acesso à rede do
          banco, publique via um <em>gateway de dados local</em>.
        </p>
        {conn ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-slate-50 rounded-lg p-3">
            <div>
              <p className="text-xs text-slate-400">Servidor</p>
              <p className="font-mono">{conn.host}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Porta</p>
              <p className="font-mono">{conn.port}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Banco de dados</p>
              <p className="font-mono">{conn.database}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Usuário</p>
              <p className="font-mono">{conn.user}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-amber-600">DATABASE_URL não configurada.</p>
        )}
        <p className="text-xs text-slate-400 mt-3">
          A senha não é exibida aqui por segurança — use a mesma configurada em <code>DATABASE_URL</code>.
        </p>
      </Card>

      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={20} className="text-indigo-600" />
          <h3 className="font-semibold text-slate-800">
            Opção 2 — API REST autenticada (Power BI Service / Power Query Web)
          </h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Quando o Power BI não pode acessar o banco diretamente, use{" "}
          <strong>Obter Dados → Web</strong> apontando para os endpoints abaixo, enviando o header{" "}
          <code className="bg-slate-100 px-1 rounded">x-api-key</code>. Cada endpoint retorna JSON no
          formato <code className="bg-slate-100 px-1 rounded">{"{ value: [...] }"}</code>, pronto para
          expandir em tabela no Power Query.
        </p>
        <div className="mb-3">
          {apiKeyConfigured ? (
            <Badge tone="success">Chave de API configurada (POWERBI_API_KEY)</Badge>
          ) : (
            <Badge tone="danger">POWERBI_API_KEY não configurada no .env</Badge>
          )}
        </div>
        <div className="space-y-2">
          {Object.entries(BI_DATASETS).map(([key, ds]) => (
            <div key={key} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-slate-700">{ds.label}</p>
                <code className="text-xs text-slate-500">
                  GET {baseUrl}/api/powerbi/{key}
                </code>
              </div>
              <Badge tone="info">{ds.view}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-slate-800 mb-2 text-sm">Exemplo (Power Query M)</h3>
        <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto">
{`let
    Source = Json.Document(
        Web.Contents("${baseUrl}/api/powerbi/enrollments",
            [Headers=[#"x-api-key"="SUA_CHAVE_AQUI"]]
        )
    ),
    value = Source[value],
    ToTable = Table.FromRecords(value)
in
    ToTable`}
        </pre>
      </Card>
    </div>
  );
}
