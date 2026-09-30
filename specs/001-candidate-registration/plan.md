# Implementation Plan: Cadastro e Consulta de Candidatos

**Branch**: `dev` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-candidate-registration/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Aplicação web para recrutadores cadastrarem candidatos de forma manual ou a partir de um
currículo em PDF, e depois consultá-los numa listagem com tela de detalhes.

- **Frontend**: Angular 22 com Taiga UI 5.26.0. Um único formulário atende os dois modos de
  cadastro. O estado é reativo, com sinais.
- **Backend**: Node.js 26 com TypeScript e Express 5, em camadas Controller → Service →
  Repository.
- **Banco**: SQL Server 2025. O schema é criado por migrations SQL que o backend executa ao
  iniciar.
- **Extração do PDF**: fica isolada em `ResumeExtractionService`, que usa o `unpdf` para ler o
  texto e o parser puro `ResumeFieldParser` para identificar Nome, E-mail e Telefone. O arquivo
  é processado só em memória e depois descartado.
- **Execução**: tudo sobe com `docker compose up --build` (`db`, `backend`, `frontend`).
- **Versionamento**: automatizado pelo semantic-release no `main`.

### Ajustes em relação à entrada do `/speckit-plan`

| Pedido                                                          | Decisão no plano                                                                                          | Motivo |
|-----------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|--------|
| Scripts `release`/`prerelease` com `standard-version`           | **Removidos** (decisão do usuário, 2026-09-29); entra `release:dry` com `semantic-release --dry-run`       | Constituição III; `standard-version` sem release desde 2022; `prerelease` roda como hook antes de `release` ([R14](./research.md)) |
| Dependências do semantic-release                                | Todas mantidas, mais `conventional-changelog-conventionalcommits`                                          | Obrigatória para o `preset: conventionalcommits` |
| "pdf-parse ou pdf2json"                                         | `unpdf` (pdf.js, 2,1 MB, sem dependências)                                                                 | Spike: `pdf2json` inverte a ordem das linhas; `pdf-parse` traz um binário nativo de 21 MB ([R3](./research.md)) |
| `docker-compose up --build`                                     | Documentado como `docker compose up --build`, com nota sobre o alias legado                                | Compose v2 e constituição I |
| Instalação do pnpm na imagem Node                               | `npm i -g pnpm@11.21.0`                                                                                    | O Node 26 não inclui mais o Corepack ([R1](./research.md)) |
| Nginx alpine                                                    | `nginx:1.30-alpine` (linha stable), proxy `/api` e `client_max_body_size 6m`                               | Sem o ajuste, o limite padrão de 1 MB do Nginx recusaria PDFs válidos ([R11](./research.md)) |

## Technical Context

**Language/Version**: TypeScript 6.0.3 (backend e frontend; o Angular 22 exige `>=6.0 <6.1`).
Runtime Node.js 26.10.0 (`node:26.10-bookworm-slim`).

**Primary Dependencies**:
- **Backend**: Express 5.2.1, multer 2.4.0 (upload em memória), zod 4.6.5 (validação), mssql
  12.7.2 (driver), unpdf 1.8.1 (texto do PDF) e pino 10 (logs).
- **Frontend**: Angular 22.2.0 (standalone, zoneless, Reactive Forms tipados, sinais), Taiga UI
  5.26.0 (`core`, `kit`, `cdk`, `icons`, `i18n`, `styles`, `addon-table`, `layout`), Maskito 5
  (máscara de telefone) e `less` (compilação do tema da Taiga).
- **Raiz**: semantic-release 25.0.9 e plugins (`commit-analyzer` 13.0.1,
  `release-notes-generator` 14.1.1, `changelog` 7.0.0, `npm` 13.2.0, `github` 12.0.10,
  `git` 11.0.1), `conventional-changelog-conventionalcommits` 10.4.0, commitlint 21.2.3,
  husky 9.1.7 e pdfkit 0.20 (gerador dos PDFs de exemplo).
- **pnpm 11**: cada app tem um `pnpm-workspace.yaml` com `allowBuilds`, que libera os scripts
  de build de `esbuild`, `lmdb`, `@parcel/watcher` e `msgpackr-extract` (bloqueados por padrão).

**Storage**: SQL Server 2025 (`mcr.microsoft.com/mssql/server:2025-latest`, amd64). Uma tabela,
`dbo.Candidates`, e a tabela de controle `dbo.SchemaMigrations`, no volume nomeado
`mssql-data`. O PDF não é armazenado (FR-024).

**Testing**:
- **Backend**: Vitest 5.0.2 (unitários de services e parser) e supertest 7.3 (HTTP com fakes).
- **Frontend**: `ng test` com `@angular/build:unit-test` (Vitest 5 + jsdom 30); um `*.spec.ts`
  por componente.
- **Ponta a ponta**: validação manual guiada pelo [quickstart.md](./quickstart.md).

**Target Platform**: containers Linux amd64, via Docker Compose v2 no ambiente local. Qualquer
navegador moderno (evergreen).

**Project Type**: aplicação web: SPA Angular servida por Nginx, API REST Node.js e SQL Server.

**Performance Goals**:
- Resultado da extração em até 5 s para PDFs de até 5 MB (SC-003). A extração lê no máximo 5
  páginas e tem timeout de 4 s.
- Listagem em até 2 s com 1.000 candidatos (SC-008), com o índice
  `IX_Candidates_CreatedAt`.

**Constraints**:
- Upload de no máximo 5.242.880 bytes, verificado pelo conteúdo (`%PDF-`).
- Nenhum PDF nem texto extraído é persistido ou registrado em log (LGPD).
- A falha da extração nunca bloqueia o cadastro manual.
- Mensagens em pt-BR ([ui-contract.md](./contracts/ui-contract.md)).
- Os 3 containers pedidos, com as portas 1433, 3000 e 4200→80.

**Scale/Scope**: alguns milhares de candidatos, poucos usuários ao mesmo tempo, sem login.
São 3 telas (listagem, cadastro, detalhes) e 4 endpoints (`health`, listar, criar e detalhar
candidatos, extrair currículo).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constituição v1.1.0. Avaliação **antes** da pesquisa (plano proposto) e **depois** do design da
Fase 1 (artefatos concluídos).

| Princípio / seção | Como o plano atende | Antes | Depois |
|-------------------|---------------------|-------|--------|
| **I. Architecture & Stack** | Angular 22, Node.js 26 com TypeScript e SQL Server 2025; `Dockerfile` em `backend/` e `frontend/`; `docker-compose.yml` na raiz com `db`, `backend` e `frontend`. `docker compose up --build` depois de `cp .env.example .env` basta. Em hosts ARM é preciso a emulação x86 do Docker, e isso fica documentado como pré-requisito. | PASS | PASS |
| **II. Package Manager** | Três projetos pnpm independentes (raiz, `backend/`, `frontend/`), cada um com `pnpm-lock.yaml` versionado e `packageManager: pnpm@11.21.0`. Os Dockerfiles usam `pnpm install --frozen-lockfile`. Sem `package-lock.json` nem `yarn.lock`. | PASS | PASS |
| **III. Versioning & Release** | semantic-release só no `main` (workflow `release.yml`) com as `releaseRules` da constituição, `CHANGELOG.md` e `package.json` da raiz commitados pelo `@semantic-release/git`, e `npmPublish: false`. O `standard-version` foi removido. commitlint com os tipos customizados. Fluxo `dev` → PR (merge commit) → `main`. | FAIL → resolvido: os scripts com `standard-version` pedidos violavam o princípio; o usuário escolheu removê-los | PASS |
| **IV. Environment & Security** | `.env` já está no `.gitignore`. O `.env.example` lista todas as variáveis com valores de desenvolvimento; o compose usa `${VAR}`; não há segredo no código nem nos Dockerfiles. | PASS | PASS |
| **V. Code Quality** | Backend: controllers só com HTTP; services com a regra de negócio e dependentes das interfaces `CandidateRepository` e `PdfTextExtractor`; repositório como único acesso ao SQL. Frontend: componentes pequenos, serviços de API e `CandidatesStore` com sinais. `strict: true` e sem `any` nos dois lados; DTOs tipados a partir do contrato. | PASS | PASS |
| **VI. Testing & Samples** | Testes unitários de todos os services do backend e de cada componente Angular. `samples/` com 8 PDFs fictícios de layouts e falhas diferentes, mais o manifesto do resultado esperado ([R16](./research.md)). | PASS | PASS |
| **VII. Documentation** | `README.md` com o passo a passo Docker do backend, do frontend e do compose. `DESENVOLVIMENTO.md` com sumário navegável e as 8 seções, na ordem da constituição. | PASS | PASS |
| **Technical Constraints** | Layout de raiz conforme a constituição. O schema é criado automaticamente, pelas migrations que o backend executa ao iniciar. As dependências relevantes (unpdf, mssql, Express, Taiga UI) são justificadas na seção 2 do `DESENVOLVIMENTO.md`. | PASS | PASS |
| **Workflow & Gates** | `ci.yml` automatiza os gates 1 a 3 (commitlint, build strict, testes) nos PRs para o `main`. O gate 4 é validado pelo quickstart; os gates 5 e 6 ficam no checklist de revisão do PR. | PASS | PASS |

**Resultado**: nenhuma violação sem justificativa. A única falha inicial (III) foi resolvida
antes da Fase 0, por decisão do usuário.

## Project Structure

### Documentation (this feature)

```text
specs/001-candidate-registration/
├── plan.md              # Este arquivo
├── research.md          # Fase 0: decisões R1 a R17
├── data-model.md        # Fase 1: entidade, regras de validação, estado da extração
├── quickstart.md        # Fase 1: roteiro de validação de ponta a ponta
├── contracts/
│   ├── openapi.yaml     # Contrato HTTP (4 recursos, formato de erro)
│   └── ui-contract.md   # Rotas, telas e catálogo de mensagens pt-BR
├── checklists/
│   └── requirements.md  # Checklist de qualidade da spec
└── tasks.md             # Fase 2 (/speckit-tasks; não é criado aqui)
```

### Source Code (repository root)

```text
.
├── package.json                  # "private": true; versão da app; semantic-release e chave "release"
├── pnpm-lock.yaml
├── commitlint.config.mjs         # config-conventional + tipos hotfix e breaking
├── .husky/commit-msg             # roda o commitlint
├── .github/workflows/
│   ├── ci.yml                    # PR → main: commitlint, build e teste do backend e do frontend
│   └── release.yml               # push no main: pnpm semantic
├── docker-compose.yml            # db (1433), backend (3000), frontend (4200→80)
├── .env.example
├── README.md
├── DESENVOLVIMENTO.md
├── CHANGELOG.md                  # gerado pelo release
├── samples/
│   ├── README.md                 # manifesto: resultado esperado por arquivo
│   ├── expected.json             # o mesmo manifesto, lido pelos testes de integração (SC-002)
│   ├── generate-samples.mjs      # gerador determinístico (pnpm samples:generate, pdfkit)
│   └── 01-…08-*.pdf              # currículos fictícios (research R16)
├── backend/
│   ├── Dockerfile                # multi-stage: deps → build (tsc) → test → runtime (usuário node)
│   ├── .dockerignore
│   ├── package.json · pnpm-lock.yaml · tsconfig.json · tsconfig.build.json · vitest.config.ts
│   ├── db/migrations/
│   │   └── 0001_create_candidates.sql
│   ├── src/
│   │   ├── server.ts             # bootstrap: config → migrations → listen
│   │   ├── app.ts                # createApp(deps): monta rotas e middlewares (injeção manual)
│   │   ├── config/env.ts         # variáveis de ambiente validadas com zod
│   │   ├── logger.ts             # pino: JSON no stdout, sem dados pessoais
│   │   ├── controllers/
│   │   │   ├── candidates.controller.ts
│   │   │   ├── resume-extractions.controller.ts
│   │   │   └── health.controller.ts
│   │   ├── services/
│   │   │   ├── candidate.service.ts
│   │   │   ├── health.service.ts
│   │   │   └── resume-extraction.service.ts
│   │   ├── extraction/
│   │   │   ├── pdf-text-extractor.ts        # interface + UnpdfTextExtractor
│   │   │   └── resume-field-parser.ts       # heurísticas puras (research R4)
│   │   ├── repositories/
│   │   │   ├── candidate.repository.ts      # interface
│   │   │   ├── mssql-candidate.repository.ts
│   │   │   └── database-health.repository.ts # ping do health check
│   │   ├── domain/
│   │   │   ├── candidate.ts                 # tipos de domínio e DTOs
│   │   │   ├── candidate-input.schema.ts    # regras do data-model, seção 2
│   │   │   └── errors.ts                    # AppError, EmailAlreadyExistsError, PdfUnreadableError...
│   │   ├── http/
│   │   │   ├── error-handler.ts             # AppError → ErrorResponse do contrato
│   │   │   └── pdf-upload.ts                # multer em memória + checagem de %PDF-
│   │   └── db/
│   │       ├── pool.ts
│   │       └── migrate.ts                   # cria o banco, SchemaMigrations, aplica os .sql
│   └── tests/
│       ├── unit/                 # services, parser, schema (casos compartilhados do data-model)
│       ├── http/                 # supertest com fakes (status e formato de erro do contrato)
│       └── fixtures/             # textos de currículo para o parser
└── frontend/
    ├── Dockerfile                # multi-stage: deps → build (pnpm build) → test → nginx:1.30-alpine
    ├── nginx.conf                # SPA fallback, proxy /api → backend:3000, client_max_body_size 6m
    ├── .dockerignore
    ├── proxy.conf.json           # ng serve: /api → localhost:3000
    ├── package.json · pnpm-lock.yaml · angular.json · tsconfig*.json
    ├── src/test-providers.ts · src/test-setup.ts  # providers da Taiga e polyfills do jsdom (testes)
    └── src/app/
        ├── app.config.ts · app.routes.ts · app.ts
        ├── core/
        │   ├── api/candidates-api.service.ts
        │   ├── api/resume-extraction-api.service.ts
        │   ├── api/api-error.ts              # ErrorResponse → mensagem (inclui 413 sem JSON)
        │   └── models/candidate.models.ts    # DTOs do contrato
        ├── features/candidates/
        │   ├── data/candidates.store.ts      # sinais: lista, detalhe, loading, erro
        │   ├── validation/candidate-validators.ts
        │   ├── validation/validation-messages.ts
        │   ├── validation/phone-mask.ts      # máscara Maskito (10/11 dígitos)
        │   ├── validation/pdf-file.ts        # checagem de tipo/tamanho no navegador
        │   ├── validation/resume-messages.ts # mensagens do PDF (ui-contract)
        │   ├── pages/
        │   │   ├── candidate-list-page/
        │   │   ├── candidate-create-page/
        │   │   └── candidate-detail-page/
        │   └── components/
        │       ├── candidate-form/           # formulário + estado da extração (data-model, seção 4)
        │       ├── resume-upload/            # label[tuiInputFiles] + checagens no navegador
        │       ├── candidate-table/
        │       └── candidate-details/
        └── shared/
            ├── pipes/phone-format.pipe.ts
            └── utils/phone.ts                # formatPhone, usado pelo pipe e pelo formulário
```

**Structure Decision**: aplicação web com `backend/` e `frontend/` independentes. Cada pasta
tem seu `package.json` e lockfile e é o contexto de build da sua imagem Docker. O `package.json`
da raiz existe só para o release e os hooks de commit e é a **única fonte da versão** da
aplicação. Não há workspace pnpm: as regras de validação comuns ficam no data-model e são
testadas com os mesmos casos nos dois lados ([R9](./research.md)).

### Configuração dos containers (resumo)

| Serviço    | Imagem / build                                   | Porta     | Dependência                         | Healthcheck                              |
|------------|--------------------------------------------------|-----------|-------------------------------------|------------------------------------------|
| `db`       | `mcr.microsoft.com/mssql/server:2025-latest` (amd64) | 1433:1433 | -                                   | `sqlcmd ... -Q "SELECT 1"` ([R7](./research.md)) |
| `backend`  | `./backend` (base `node:26.10-bookworm-slim`)    | 3000:3000 | `db: service_healthy`               | `GET /api/health`                        |
| `frontend` | `./frontend` (build Node → `nginx:1.30-alpine`)  | 4200:80   | `backend: service_healthy`          | -                                        |

Volume nomeado: `mssql-data` → `/var/opt/mssql`. O `backend` usa `restart: on-failure` para
tentar de novo as migrations se o banco ainda estiver aquecendo.

### Variáveis de ambiente (`.env.example`)

| Variável                    | Padrão (dev/Docker)   | Usada por            | Descrição                                              |
|-----------------------------|-----------------------|----------------------|--------------------------------------------------------|
| `MSSQL_SA_PASSWORD`         | `Dev_Passw0rd!2026`   | db                   | Senha do `sa`; precisa atender à política do SQL Server |
| `DB_HOST`                   | `db`                  | backend              | Host do SQL Server (`localhost` fora do Docker)        |
| `DB_PORT`                   | `1433`                | backend              | Porta do SQL Server                                    |
| `DB_NAME`                   | `recrutamento`        | backend              | Banco criado automaticamente ([R6](./research.md))     |
| `DB_USER`                   | `sa`                  | backend              | Usuário do banco (simplificação de dev; ver melhorias) |
| `DB_PASSWORD`               | `Dev_Passw0rd!2026`   | backend              | Igual a `MSSQL_SA_PASSWORD` enquanto usar o `sa`       |
| `PORT`                      | `3000`                | backend              | Porta HTTP da API                                      |
| `LOG_LEVEL`                 | `info`                | backend              | Nível de log do pino                                   |
| `PDF_EXTRACTION_TIMEOUT_MS` | `4000`                | backend              | Timeout da leitura do PDF ([R17](./research.md))       |

### Documentação a gerar

- **`README.md`**:
  1. Visão geral e tabela de tecnologias e versões.
  2. Pré-requisitos (Docker Compose v2; host x86_64 ou emulação).
  3. Clonar e rodar `cp .env.example .env`.
  4. `docker compose up --build`, com as URLs de acesso (4200, 3000, 1433).
  5. Roteiros Docker separados para o backend (`docker build` e `docker run` com `--env-file`
     e o banco) e para o frontend (`docker build` e `docker run`).
  6. Como testar a importação com `samples/`.
  7. Como rodar os testes.
  8. Troubleshooting (senha fraca do SA, porta em uso, host ARM).
- **`DESENVOLVIMENTO.md`**: sumário navegável (links âncora) e as 8 seções da constituição,
  na ordem. A seção 8 inclui as limitações da extração e as melhorias listadas na
  spec e no research: login, OCR, worker threads, usuário de banco dedicado, tag fixa do SQL
  Server e pacote de validação compartilhado.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Nenhuma violação a justificar. O pedido original de usar o `standard-version`, que violaria o
Princípio III, foi retirado por decisão do usuário antes da Fase 0 (ver Summary).
