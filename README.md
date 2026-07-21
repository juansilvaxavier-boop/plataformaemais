# EMAIS Urbanismo | LMS Corporativo

Plataforma de Treinamento Interno Corporativo da EMAIS Urbanismo: capacitação, compliance e um assistente de IA (RAG) integrados em um único ecossistema, conforme a especificação do sistema.

## Stack

- **Next.js 15** (App Router, TypeScript, Server Actions) + **Tailwind CSS 4**
- **PostgreSQL 16 + pgvector** via **Prisma 6** (RAG usa `Unsupported("vector(1536)")` e raw SQL para similaridade de cosseno)
- **Auth.js (NextAuth v5)**: login por e-mail/senha sempre ativo; Google Workspace, Microsoft Entra ID (Azure AD) e Okta ativados automaticamente quando as credenciais correspondentes existem no `.env`
- **pdf-lib** para geração de certificados em PDF
- Camada de IA com **fallback offline**: sem `OPENAI_API_KEY`, o assistente usa busca extrativa por palavras-chave e heurísticas de sumarização/geração de quiz em vez de chamar um LLM — a plataforma funciona 100% sem nenhuma chave externa

## Como rodar localmente

```bash
npm install

# Banco de dados: use o docker-compose (requer Docker) OU um Postgres local com a extensão "vector" instalada
docker compose up -d

cp .env.example .env
# ajuste DATABASE_URL se necessário e gere um AUTH_SECRET novo:
# node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

npx prisma migrate deploy
npm run db:seed   # cria departamentos, usuários, cursos, trilhas, badges e competências de exemplo
npm run dev
```

Acesse `http://localhost:3000`. Contas de exemplo (senha `senha123` para todas):

| E-mail | Papel |
|---|---|
| admin@plataforma.com | Administrador |
| gestor@plataforma.com | Gestor |
| instrutor@plataforma.com | Instrutor |
| colaborador1@plataforma.com | Colaborador (Tecnologia) |
| colaborador2@plataforma.com | Colaborador (Vendas) |

> Nota de ambiente: se não houver Docker disponível, um PostgreSQL 16 local com o pacote `postgresql-16-pgvector` (ou equivalente) instalado funciona da mesma forma — basta apontar `DATABASE_URL` para ele.

## Funcionalidades implementadas

### Core
- **Gestão de treinamentos**: cursos → módulos → aulas (vídeo/PDF/apresentação) → materiais de apoio, com transcrição opcional
- **RBAC por cargo/departamento**: papéis `ADMIN > MANAGER > INSTRUCTOR > EMPLOYEE`; cursos e trilhas podem ser direcionados por papel e/ou departamento com matrícula automática
- **Validação estrita de reprodução (100%)**: heartbeat periódico (`POST /api/lessons/:id/heartbeat`) valida a posição do vídeo no servidor; qualquer salto acima da tolerância (5s) é rejeitado com HTTP 409 e o player é realinhado; a aula só é marcada como concluída ao atingir 98%+ de reprodução
- **Certificados automáticos em PDF** com código de verificação único e página pública `/verify/[codigo]`
- **Assistente de IA (RAG)**: indexa transcrições de aulas e materiais (`DocumentChunk` + pgvector), respondendo no chat lateral do curso com base no conteúdo indexado

### Módulos expandidos
- **Aprendizado & Avaliação**: quizzes com nota de corte bloqueando a etapa seguinte; trilhas de aprendizagem sequenciais; materiais anexados; anotações privadas por timestamp do vídeo; NPS pós-conclusão do curso
- **Engajamento & Gamificação**: pontos, badges configuráveis (`/admin/badges`), streak diário, ranking geral e por departamento (`/ranking`)
- **Gestão, Liderança & Compliance**: painel do gestor com progresso dos liderados diretos; recertificação periódica configurável por curso (reabre a matrícula e zera o progresso ao vencer); relatórios de auditoria exportáveis em CSV; matriz de competências
- **IA avançada**: geração automática de quiz a partir da transcrição; resumo executivo de aulas; sugestões personalizadas por histórico/cargo
- **Integrações & Experiência**: SSO (Google/Entra/Okta) condicional por env vars; webhook de onboarding automático via HRIS; notificações replicadas para Slack/Teams via webhook de entrada; legendas (.vtt) geradas a partir da transcrição; suporte multi-idioma (pt-BR/en) com seletor de idioma na barra lateral

## Arquitetura e decisões relevantes

- **Heartbeat anti-fraude**: a validação de progresso vive inteiramente no servidor (`src/app/api/lessons/[id]/heartbeat/route.ts`); o cliente nunca é a fonte de verdade — mesmo chamando a API diretamente não é possível concluir uma aula sem reproduzi-la de forma contínua.
- **RAG com fallback dual**: `src/lib/ai/rag.ts` usa embeddings + pgvector quando `OPENAI_API_KEY` está definido; caso contrário, ranqueia trechos por sobreposição de palavras-chave. O mesmo padrão se aplica à geração de quiz e resumos (`src/lib/ai/content-generation.ts`).
- **Recertificação**: como um curso concluído não pode ter duas matrículas simultâneas (`@@unique([userId, courseId])`), o vencimento reabre a mesma matrícula (status volta a `NOT_STARTED`) e apaga o progresso de aulas/quizzes daquele curso, exigindo nova conclusão completa — fiel ao requisito de renovação anual. Em produção, agende `POST /api/admin/recertification-check` via cron externo (Vercel Cron, GitHub Actions, etc.).
- **Legendas automáticas**: sem um provedor de ASR configurado, `src/lib/captions.ts` distribui o texto da transcrição proporcionalmente à duração do vídeo (best-effort). Para timestamps precisos, plugue um serviço de transcrição real e grave `captionSegments` com os tempos reais.
- **i18n**: o mecanismo (`src/lib/i18n.ts`) está aplicado à navegação principal e ao dashboard como prova de conceito; estender a cobertura a 100% da interface segue o mesmo padrão de dicionário.

## Integrações externas (dependem de credenciais)

Configuráveis via `.env`, todas opcionais — a plataforma opera sem elas:

| Integração | Variáveis | Efeito quando ausente |
|---|---|---|
| OpenAI (chat + embeddings) | `OPENAI_API_KEY` | Assistente/IA operam em modo offline (extrativo) |
| Google Workspace SSO | `AUTH_GOOGLE_ID/SECRET` | Login por e-mail/senha continua funcionando |
| Microsoft Entra ID SSO | `AUTH_MICROSOFT_ENTRA_ID_*` | idem |
| Okta SSO | `AUTH_OKTA_*` | idem |
| Slack/Teams | `SLACK_WEBHOOK_URL` / `TEAMS_WEBHOOK_URL` | Notificações ficam só in-app |
| HRIS onboarding | `HRIS_WEBHOOK_API_KEY` (já gerada no `.env`) | Endpoint `/api/integrations/hris/onboarding` exige essa chave no header `x-api-key` |

## Scripts

```bash
npm run dev        # servidor de desenvolvimento
npm run build      # build de produção (também roda checagem de tipos e lint)
npm run lint        # ESLint
npm run db:seed     # popula dados de demonstração
npx prisma studio    # explorar o banco visualmente
```
