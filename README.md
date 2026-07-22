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
- **Gestão de treinamentos**: cursos → módulos → aulas (vídeo/PDF/apresentação) → materiais de apoio para download, com transcrição opcional. Vídeos aceitam link do YouTube (inclusive não listado — o sistema detecta a URL e gera o player embutido via IFrame API) ou upload/URL de arquivo direto (mp4); o heartbeat anti-fraude funciona nos dois casos.
- **RBAC por cargo/departamento**: papéis `ADMIN > MANAGER > INSTRUCTOR > EMPLOYEE`; cursos e trilhas podem ser direcionados por papel e/ou departamento com matrícula automática. Os **cargos** (jobTitle) de cada departamento são cadastráveis em `/admin/departamentos` e sugeridos automaticamente ao criar um colaborador.
- **Validação estrita de reprodução (100%)**: heartbeat periódico (`POST /api/lessons/:id/heartbeat`) valida a posição do vídeo no servidor; qualquer salto acima da tolerância (5s) é rejeitado com HTTP 409 e o player é realinhado; a aula só é marcada como concluída ao atingir 98%+ de reprodução
- **Certificados automáticos em PDF** com código de verificação único e página pública `/verify/[codigo]`
- **Assistente de IA (RAG)**: indexa transcrições de aulas e materiais (`DocumentChunk` + pgvector), respondendo no chat lateral do curso com base no conteúdo indexado

### Módulos expandidos
- **Aprendizado & Avaliação**: quizzes com nota de corte bloqueando a etapa seguinte; trilhas de aprendizagem sequenciais; materiais anexados; anotações privadas por timestamp do vídeo; NPS pós-conclusão do curso
- **Engajamento & Gamificação**: pontos, badges configuráveis (`/admin/badges`), streak diário, ranking geral e por departamento (`/ranking`)
- **Gestão, Liderança & Compliance**: painel do gestor com progresso dos liderados diretos; recertificação periódica configurável por curso (reabre a matrícula e zera o progresso ao vencer); relatórios de auditoria exportáveis em CSV; matriz de competências; **gestão de treinamentos presenciais e externos** (`/admin/treinamentos-externos`) para registrar workshops, conferências e capacitações com instrutor externo, com controle de presença, comprovantes e competências concedidas
- **IA avançada**: geração automática de quiz a partir da transcrição; resumo executivo de aulas; sugestões personalizadas por histórico/cargo
- **Integrações & Experiência**: SSO (Google/Entra/Okta) condicional por env vars; webhook de onboarding automático via HRIS; notificações replicadas para Slack/Teams via webhook de entrada; legendas (.vtt) geradas a partir da transcrição; suporte multi-idioma (pt-BR/en) com seletor de idioma na barra lateral; **catálogo de cursos em vitrine estilo streaming** (`/cursos`), com hero em destaque e fileiras horizontais roláveis por categoria; **integração direta com Power BI** via views SQL dedicadas e API REST autenticada (`/admin/power-bi`)

## Arquitetura e decisões relevantes

- **Heartbeat anti-fraude**: a validação de progresso vive inteiramente no servidor (`src/app/api/lessons/[id]/heartbeat/route.ts`); o cliente nunca é a fonte de verdade — mesmo chamando a API diretamente não é possível concluir uma aula sem reproduzi-la de forma contínua.
- **RAG com fallback dual**: `src/lib/ai/rag.ts` usa embeddings + pgvector quando `OPENAI_API_KEY` está definido; caso contrário, ranqueia trechos por sobreposição de palavras-chave. O mesmo padrão se aplica à geração de quiz e resumos (`src/lib/ai/content-generation.ts`).
- **Recertificação**: como um curso concluído não pode ter duas matrículas simultâneas (`@@unique([userId, courseId])`), o vencimento reabre a mesma matrícula (status volta a `NOT_STARTED`) e apaga o progresso de aulas/quizzes daquele curso, exigindo nova conclusão completa — fiel ao requisito de renovação anual. Em produção, agende `POST /api/admin/recertification-check` via cron externo (Vercel Cron, GitHub Actions, etc.).
- **Legendas automáticas**: sem um provedor de ASR configurado, `src/lib/captions.ts` distribui o texto da transcrição proporcionalmente à duração do vídeo (best-effort). Para timestamps precisos, plugue um serviço de transcrição real e grave `captionSegments` com os tempos reais.
- **i18n**: o mecanismo (`src/lib/i18n.ts`) está aplicado à navegação principal e ao dashboard como prova de conceito; estender a cobertura a 100% da interface segue o mesmo padrão de dicionário.
- **Power BI**: seis views SQL dedicadas (`vw_bi_*`, migração `power_bi_views`) achatam matrículas, certificados, tentativas de quiz, matriz de competências, treinamentos externos e NPS para consumo direto. O conector nativo PostgreSQL do Power BI lê essas views como tabelas comuns (sem exportação manual); para cenários em nuvem sem acesso direto ao banco, os mesmos dados ficam disponíveis via `GET /api/powerbi/{dataset}` (autenticado por `x-api-key: POWERBI_API_KEY`), consumível pelo conector Web/Power Query.

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
| Power BI (API REST) | `POWERBI_API_KEY` (já gerada no `.env`) | Endpoints `/api/powerbi/*` exigem essa chave no header `x-api-key`; a conexão direta via views Postgres não depende dela |
| E-mail transacional (SMTP) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Notificações por e-mail (boas-vindas, recuperação de senha, etc.) ficam só como notificação in-app; em desenvolvimento, o link de redefinição de senha é impresso no log do servidor |
| Recertificação automática (cron) | Secrets do repositório `APP_URL` e `CRON_API_KEY` | O workflow `.github/workflows/recertification-cron.yml` roda diariamente sem depender de conta externa (Vercel Cron, etc.) — só requer o app publicado em algum URL acessível |

## Funcionalidades adicionais desta rodada

- **Recuperação de senha**: `/esqueci-senha` → e-mail com link de uso único (1h) → `/redefinir-senha/[token]`. Tokens são de uso único e armazenados como hash (SHA-256), nunca em texto puro.
- **Minha Conta** (`/conta`): dados do perfil e troca de senha (contas SSO não têm senha local).
- **Upload de arquivos**: capas de curso, materiais de aula e comprovantes de treinamento externo podem ser enviados diretamente (armazenamento local em `public/uploads`, trocável por S3/Vercel Blob reimplementando `src/app/api/upload/route.ts`) ou informados por URL.
- **Busca no catálogo**: campo de busca em `/cursos` filtrando por título, categoria e descrição em tempo real.
- **Atribuição manual avulsa**: na página de um curso (`/admin/cursos/[id]`), o admin pode matricular um colaborador específico fora das regras de cargo/departamento.
- **Rate limiting**: limitador de taxa (janela fixa, em memória) nos endpoints de chat de IA, heartbeat, tentativa de quiz, login, recuperação de senha, upload, webhook de HRIS e API do Power BI — ver `src/lib/rate-limit.ts`.
- **Sidebar responsiva**: menu lateral vira um drawer com botão hambúrguer em telas pequenas (`src/components/sidebar-nav.tsx`).
- **CI**: `.github/workflows/ci.yml` roda lint, testes e build a cada push/PR.

## Testes

Testes unitários (Vitest) cobrem a lógica pura mais crítica do sistema — a
validação anti-fraude de reprodução de vídeo (`src/lib/heartbeat.ts`), a
correção de quizzes (`src/lib/quiz-scoring.ts`), RBAC, rate limiting, geração
de legendas e chunking de texto para RAG — sem depender de banco de dados.

```bash
npm test          # roda a suíte uma vez
npm run test:watch  # modo watch
```

## Scripts

```bash
npm run dev        # servidor de desenvolvimento
npm run build      # build de produção (também roda checagem de tipos e lint)
npm run lint        # ESLint
npm test            # testes unitários (Vitest)
npm run db:seed     # popula dados de demonstração
npx prisma studio    # explorar o banco visualmente
```
