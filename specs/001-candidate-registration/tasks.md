---

description: "Task list for feature 001 - Cadastro e Consulta de Candidatos"
---

# Tasks: Cadastro e Consulta de Candidatos

**Input**: Design documents from `/specs/001-candidate-registration/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: **obrigatórios**. A constituição (Princípio VI) exige testes unitários dos services
de negócio do backend e de cada componente Angular. Em cada história, os testes vêm antes da
implementação e DEVEM falhar antes dela.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `backend/tests/`, `frontend/src/app/`. A raiz tem as ferramentas
  de release, o compose, a documentação e `samples/`.
- Referências curtas usadas abaixo:
  - **R1 a R17** = seções do [research.md](./research.md).
  - **DM§n** = seção n do [data-model.md](./data-model.md).
  - **UI** = [contracts/ui-contract.md](./contracts/ui-contract.md).
  - **API** = [contracts/openapi.yaml](./contracts/openapi.yaml).
- As mensagens ao usuário DEVEM ser copiadas **literalmente** de **UI**.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicializar os três projetos pnpm (raiz, backend, frontend), as ferramentas de
release e a documentação inicial.

- [X] T001 Criar o `package.json` da raiz com:
  - `"name": "cieepr-challenge"`, `"version": "0.0.0"`, `"private": true`,
    `"packageManager": "pnpm@11.21.0"` e `"engines": { "node": ">=24.15.0" }`.
  - Scripts: `"semantic": "semantic-release --branches main"`,
    `"release:dry": "semantic-release --dry-run --no-ci --branches main"`, `"prepare": "husky"`
    e `"samples:generate": "node samples/generate-samples.mjs"`.
  - `devDependencies`: `semantic-release@^25.0.9`, `@semantic-release/commit-analyzer@^13.0.1`,
    `@semantic-release/release-notes-generator@^14.1.1`, `@semantic-release/changelog@^7.0.0`,
    `@semantic-release/npm@^13.2.0`, `@semantic-release/github@^12.0.10`,
    `@semantic-release/git@^11.0.1`, `conventional-changelog-conventionalcommits@^10.4.0`,
    `@commitlint/cli@^21.2.3`, `@commitlint/config-conventional@^21.2.3`, `husky@^9.1.7` e
    `pdfkit@^0.20.2`.
  - **Não** incluir `standard-version` nem os scripts `release` e `prerelease` (R14).
- [X] T002 Adicionar a chave `"release"` ao `package.json` da raiz, conforme R14:
  - `"branches": ["main"]`.
  - Plugins, nesta ordem:
    1. `@semantic-release/commit-analyzer` com `preset: "conventionalcommits"` e
       `releaseRules`: `{breaking: true → major}`, `{type: "breaking" → major}`,
       `{type: "feat" → minor}`, `{type: "hotfix" → minor}`, `{type: "fix" → patch}` e
       `{type: "perf" → patch}`.
    2. `@semantic-release/release-notes-generator` com `preset: "conventionalcommits"` e
       `presetConfig.types` com seções para `feat` (Funcionalidades), `hotfix` (Hotfixes),
       `fix` (Correções), `perf` (Performance) e `breaking` (Mudanças incompatíveis).
    3. `@semantic-release/changelog` com `changelogFile: "CHANGELOG.md"`.
    4. `@semantic-release/npm` com `npmPublish: false`.
    5. `@semantic-release/github`.
    6. `@semantic-release/git` com `assets: ["CHANGELOG.md", "package.json"]` e
       `message: "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"`.
- [X] T003 [P] Criar `commitlint.config.mjs`, que estende `@commitlint/config-conventional` com
  a regra `type-enum` `[2, 'always', ['build','chore','ci','docs','feat','fix','perf',
  'refactor','revert','style','test','hotfix','breaking']]`. Criar `.husky/commit-msg` com
  `pnpm exec commitlint --edit "$1"`.
- [X] T004 Rodar `pnpm install` na raiz (gera `pnpm-lock.yaml` e instala o hook do husky) e
  conferir o resultado:
  - `echo "hotfix: x" | pnpm exec commitlint` passa.
  - `echo "breaking: x" | pnpm exec commitlint` passa.
  - `echo "update" | pnpm exec commitlint` falha.
  - `pnpm release:dry` executa sem erro de módulo ausente.
- [X] T005 [P] Criar o projeto backend em `backend/`:
  - `backend/package.json`:
    - `"name": "cieepr-backend"`, `"private": true`, `"type": "module"`,
      `"packageManager": "pnpm@11.21.0"` e `"engines": { "node": ">=24.15.0" }`.
    - Scripts: `build` = `tsc -p tsconfig.build.json`, `start` = `node dist/server.js`,
      `dev` = `tsx watch --env-file-if-exists=../.env src/server.ts`, `test` = `vitest run`,
      `test:watch` = `vitest` e `typecheck` = `tsc --noEmit`.
    - `dependencies`: `express@^5.2.1`, `multer@^2.4.0`, `zod@^4.6.5`, `mssql@^12.7.2`,
      `unpdf@^1.8.1`, `pino@^10.3.1` e `pino-http@^11.0.0`.
    - `devDependencies`: `typescript@~6.0.3`, `@types/node@^26.6.3`, `@types/express@^5.0.6`,
      `@types/multer@^2.3.0`, `@types/mssql@^12.3.0`, `vitest@^5.0.2`, `supertest@^7.3.0`,
      `@types/supertest` e `tsx@^4.23.15`.
  - `backend/tsconfig.json`:
    - `target: "ES2024"` e `module`/`moduleResolution: "NodeNext"`.
    - `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`,
      `noFallthroughCasesInSwitch`, `verbatimModuleSyntax` e `skipLibCheck` ativados.
    - `include` com `src` e `tests`.
  - `backend/tsconfig.build.json`: estende o anterior, com `rootDir: "src"`,
    `outDir: "dist"`, `include: ["src"]`.
  - `backend/vitest.config.ts`: `environment: "node"` e `include: ["tests/**/*.spec.ts"]`.
  - Rodar `pnpm install` em `backend/` para gerar `backend/pnpm-lock.yaml`.
- [X] T006 [P] Criar o projeto frontend em `frontend/` com o Angular CLI 22.2.0
  (`pnpm dlx @angular/cli@22.2.0 new frontend --directory frontend --package-manager pnpm
  --routing --style scss --ssr false --skip-git`) e depois:
  - Fixar `typescript@~6.0.3`.
  - Adicionar `"packageManager": "pnpm@11.21.0"`.
  - Rodar `pnpm ng add taiga-ui@5.26.0`.
  - Instalar `@maskito/angular@^5.6.0`, `@maskito/core@^5.6.0` e `@maskito/kit@^5.6.0`.
  - Garantir que `ng test` use `@angular/build:unit-test` com `vitest@^5.0.2` e
    `jsdom@^30.1.1`.
  - Garantir `strict: true` no `tsconfig.json` e `strictTemplates: true` em
    `angularCompilerOptions`.
  - Conferir que `pnpm build` e `pnpm test` passam no projeto gerado.
- [X] T007 [P] Criar `.env.example` na raiz com um comentário de uma linha por variável e
  exatamente estes valores (tabela "Variáveis de ambiente" do [plan.md](./plan.md)):
  - `MSSQL_SA_PASSWORD=Dev_Passw0rd!2026`
  - `DB_HOST=db`, `DB_PORT=1433`, `DB_NAME=recrutamento`, `DB_USER=sa`
  - `DB_PASSWORD=Dev_Passw0rd!2026`, com o comentário "igual a MSSQL_SA_PASSWORD enquanto usar
    o sa"
  - `PORT=3000`, `LOG_LEVEL=info`, `PDF_EXTRACTION_TIMEOUT_MS=4000`
- [X] T008 [P] Criar `backend/.dockerignore` e `frontend/.dockerignore` com `node_modules`,
  `dist`, `.angular`, `coverage`, `*.log`, `.env` e `.env.*`.
- [X] T009 [P] Criar `.github/workflows/ci.yml`, disparado em `pull_request` para `main` e em
  `push` para `dev`, com três jobs:
  - **commitlint**: `actions/checkout` com `fetch-depth: 0`, depois `pnpm install
    --frozen-lockfile` na raiz e
    `pnpm exec commitlint --from ${{ github.event.pull_request.base.sha }} --to
    ${{ github.event.pull_request.head.sha }}`, só em PRs.
  - **backend**: `actions/setup-node` com `node-version: 26.10.0`, `pnpm/action-setup` com
    `package_json_file: backend/package.json` e depois, em `backend/`, `pnpm install
    --frozen-lockfile`, `pnpm build` e `pnpm test`.
  - **frontend**: igual ao backend, em `frontend/`.
- [X] T010 [P] Criar `.github/workflows/release.yml`, disparado em `push` para `main`:
  - `permissions: contents: write, issues: write, pull-requests: write`.
  - `actions/checkout` com `fetch-depth: 0`, `actions/setup-node` com `26.10.0` e
    `pnpm/action-setup`.
  - `pnpm install --frozen-lockfile` na raiz e `pnpm semantic` com
    `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`.
  - Um comentário no topo avisando que a proteção de branch exige um token com bypass (R14).
- [X] T011 [P] Substituir o conteúdo provisório de `DESENVOLVIMENTO.md` pelo esqueleto
  definitivo:
  - Título e sumário navegável com links âncora.
  - As 8 seções da constituição (Princípio VII), na ordem.
  - Já preencher com o que aconteceu até aqui:
    - Seção 1: fluxo Spec Kit (constitution → specify → clarify → plan → tasks) e branches
      `dev`/`main`.
    - Seção 3: Spec Kit 1.0.11 e Claude Code (Claude Opus 5.5).
    - Seção 4: prompts usados nos comandos `/speckit-*`.
    - Seção 5: descarte do `standard-version`; troca de `pdf-parse`/`pdf2json` por `unpdf`
      depois do spike.
  - Deixar marcado como "a preencher pelo autor" o que só o autor sabe: tempo estimado e real,
    e o uso do Gemini.

**Checkpoint**: três projetos pnpm instalados com lockfile, commitlint funcionando e
`release:dry` executável.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Base de backend, frontend e Docker que todas as histórias usam.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend: base

- [X] T012 [P] Criar `backend/src/config/env.ts` com `loadConfig(env = process.env): AppConfig`,
  validado com zod:
  - `DB_HOST`: string, padrão `localhost`.
  - `DB_PORT`: número, padrão `1433`.
  - `DB_NAME`: regex `^[A-Za-z0-9_]+$`, padrão `recrutamento`.
  - `DB_USER`: padrão `sa`.
  - `DB_PASSWORD`: obrigatório, mínimo 1 caractere.
  - `PORT`: padrão `3000`.
  - `LOG_LEVEL`: enum pino, padrão `info`.
  - `PDF_EXTRACTION_TIMEOUT_MS`: padrão `4000`.
  - Uma falha lança um erro que lista as **chaves** inválidas, nunca os valores.
- [X] T013 [P] Criar `backend/src/logger.ts` com `createLogger(level)` (pino, JSON no stdout).
  Nunca registrar o corpo das requisições.
- [X] T014 [P] Criar `backend/src/domain/errors.ts` com a classe `AppError` (`code`,
  `httpStatus`, `message`, `fields?`, `reason?`) e as subclasses abaixo, cada uma com a
  mensagem exata de **UI**:

  | Subclasse                      | Código                 | HTTP |
  |--------------------------------|------------------------|------|
  | `ValidationError(fields)`      | `VALIDATION_ERROR`     | 400  |
  | `EmailAlreadyExistsError`      | `EMAIL_ALREADY_EXISTS` | 409  |
  | `CandidateNotFoundError`       | `CANDIDATE_NOT_FOUND`  | 404  |
  | `FileRequiredError`            | `FILE_REQUIRED`        | 400  |
  | `FileTooLargeError`            | `FILE_TOO_LARGE`       | 413  |
  | `InvalidFileTypeError`         | `INVALID_FILE_TYPE`    | 415  |
  | `PdfUnreadableError(reason)`   | `PDF_UNREADABLE`       | 422  |
  | `DatabaseUnavailableError`     | `DATABASE_UNAVAILABLE` | 503  |

  - `PdfUnreadableError` aceita `reason`: `encrypted`, `corrupted`, `no_text` ou `timeout`.
  - `EmailAlreadyExistsError` preenche `fields` com `[{field:'email', code:
    'EMAIL_ALREADY_EXISTS', ...}]`.
  - `DatabaseUnavailableError` usa a mensagem "O banco de dados está indisponível no momento.
    Tente novamente em instantes."
- [X] T015 [P] Criar `backend/src/domain/candidate.ts` com:
  - Os tipos `NewCandidate` (`fullName`, `email`, `phone: string | null`,
    `areaOfInterest: string | null`, `professionalSummary: string | null`), `Candidate`
    (`id: number`, os campos de `NewCandidate` e `createdAt: Date`), `CandidateSummary` (`id`,
    `fullName`, `email`, `areaOfInterest`, `createdAt`) e `ResumeField`
    (`'fullName' | 'email' | 'phone'`).
  - Os mapeadores `toCandidateDto` e `toCandidateSummaryDto`, que convertem `createdAt` para
    ISO-8601 e devolvem as chaves do schema `Candidate`/`CandidateSummary` da **API**.
- [X] T016 Criar `backend/db/migrations/0001_create_candidates.sql` exatamente como no DM§1:
  - Tabela `dbo.Candidates`:
    - `Id INT IDENTITY(1,1)` com `PK_Candidates`.
    - `FullName NVARCHAR(250) NOT NULL` com
      `CK_Candidates_FullName_NotBlank CHECK (LEN(LTRIM(RTRIM(FullName))) > 0)`.
    - `Email NVARCHAR(250) COLLATE Latin1_General_100_CI_AS NOT NULL` com
      `UQ_Candidates_Email UNIQUE`.
    - `Phone VARCHAR(11) NULL` com `CK_Candidates_Phone_Digits CHECK (Phone IS NULL OR
      (LEN(Phone) IN (10,11) AND Phone NOT LIKE '%[^0-9]%'))`.
    - `AreaOfInterest NVARCHAR(250) NULL`.
    - `ProfessionalSummary NVARCHAR(1000) NULL`.
    - `CreatedAt DATETIME2(3) NOT NULL` com `DF_Candidates_CreatedAt DEFAULT
      SYSUTCDATETIME()`.
  - Índice `IX_Candidates_CreatedAt ON dbo.Candidates (CreatedAt DESC) INCLUDE (FullName,
    Email, AreaOfInterest)`.
- [X] T017 Criar `backend/src/db/pool.ts` com:
  - `createPool(config)`: `mssql.ConnectionPool` com `options: { encrypt: true,
    trustServerCertificate: true }`.
  - `connectWithRetry(factory, { attempts: 12, delayMs: 5000 }, logger)`: registra cada
    tentativa e lança `DatabaseUnavailableError` quando as tentativas acabam.
- [X] T018 Criar `backend/src/db/migrate.ts` (R6) com:
  - `splitSqlBatches(sql)`, que separa o script em linhas contendo só `GO` (sem diferenciar
    maiúsculas).
  - `runMigrations({ config, logger, migrationsDir = fileURLToPath(new
    URL('../../db/migrations/', import.meta.url)) })`, que:
    1. No `master`, executa `IF DB_ID(@name) IS NULL EXEC('CREATE DATABASE ' +
       QUOTENAME(@name))`.
    2. No banco, cria `dbo.SchemaMigrations` (`Name NVARCHAR(255) PRIMARY KEY`, `AppliedAt
       DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()`) se não existir.
    3. Aplica os `*.sql` pendentes em ordem alfabética, cada um numa transação, registrando o
       nome.
    4. Registra no log `migration aplicada: <arquivo>` ou `nenhuma migration pendente`.
- [X] T019 Criar `backend/src/http/error-handler.ts` com o middleware de erro do Express:
  - `AppError` → `res.status(httpStatus).json({ error: { code, message, fields?, reason? } })`,
    no formato `ErrorResponse` da **API**.
  - JSON malformado (`err.type === 'entity.parse.failed'`) → 400 `VALIDATION_ERROR`, mensagem
    "Alguns campos precisam de correção.".
  - Qualquer outro erro → registrar no log e responder 500 `INTERNAL_ERROR`, mensagem "Não foi
    possível concluir a operação agora. Tente novamente em instantes.".
- [X] T020 Criar `backend/src/controllers/health.controller.ts`, `backend/src/services/health.service.ts`,
  `backend/src/repositories/database-health.repository.ts` e `backend/src/app.ts`:
  - `createApp(deps: AppDependencies)`: desativa `x-powered-by`, usa `express.json({ limit:
    '100kb' })` e `pino-http`, monta `GET /api/health` e registra o error handler por último.
  - `AppDependencies` começa com `{ logger, healthService }`, e as histórias acrescentam os
    services.
  - A checagem segue Controller → `HealthService.isDatabaseUp()` → `DatabaseHealthRepository.ping()`
    (`SELECT 1`). Só o repositório executa SQL (constituição, Princípio V).
  - `GET /api/health` responde 200 `{status:'ok', database:'up'}` ou 503
    `DATABASE_UNAVAILABLE`.
- [X] T021 Criar `backend/src/server.ts`, que faz o bootstrap nesta ordem: `loadConfig` →
  `createLogger` → `connectWithRetry` → `runMigrations` (se falhar: log e `process.exit(1)`) →
  montagem das dependências (repositórios MSSQL → services) → `createApp` → `listen(PORT)`. Em
  `SIGTERM` e `SIGINT`, fecha o servidor HTTP e o pool.
- [X] T022 [P] Criar `backend/Dockerfile` multi-stage (R1):
  - `base`: `node:26.10-bookworm-slim` + `RUN npm install -g pnpm@11.21.0` + `WORKDIR /app`.
  - `deps`: copia `package.json` e `pnpm-lock.yaml` e roda `pnpm install --frozen-lockfile`.
  - `build`: copia `tsconfig*.json` e `src/` e roda `pnpm build`.
  - `prod-deps`: `pnpm install --frozen-lockfile --prod`.
  - `runtime`:
    - `ENV NODE_ENV=production`.
    - Copia `node_modules`, `dist/`, `db/migrations/` e `package.json` com
      `--chown=node:node`.
    - `USER node` e `EXPOSE 3000`.
    - `HEALTHCHECK CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"`.
    - `CMD ["node","dist/server.js"]`.
- [X] T023 [P] Criar `backend/tests/unit/config/env.spec.ts` (padrões, `DB_NAME` inválido
  recusado, erro sem valores sensíveis) e `backend/tests/unit/db/migrate.spec.ts`
  (`splitSqlBatches` com `GO`, `go`, `GO` com espaços e script sem `GO`).
- [X] T024 [P] Criar `backend/tests/http/health.spec.ts` com supertest sobre `createApp`: 200
  quando `checkDatabase` resolve `true`; 503 `DATABASE_UNAVAILABLE` quando resolve `false`;
  erro genérico lançado numa rota de teste → 500 `INTERNAL_ERROR`, sem stack trace no corpo.

### Frontend: base

- [X] T025 [P] Criar `frontend/src/app/core/models/candidate.models.ts` com os tipos
  espelhados da **API**: `CandidateInput`, `CandidateSummary`, `Candidate`, `ResumeField`,
  `ResumeExtractionResult`, `FieldError`, a união `ApiErrorCode` (todos os códigos do enum,
  mais `NETWORK_ERROR`) e a união `PdfUnreadableReason`.
- [X] T026 [P] Criar `frontend/src/app/core/api/api-error.ts` com
  `toApiError(err: HttpErrorResponse): ApiError` (`status`, `code`, `message?`, `fields`,
  `reason?`):
  - Corpo com `error.code` → usa o corpo.
  - Status 413 sem JSON (Nginx) → `FILE_TOO_LARGE`.
  - Status 0 → `NETWORK_ERROR`.
  - Outros casos → `INTERNAL_ERROR`.

  Testes em `frontend/src/app/core/api/api-error.spec.ts`.
- [X] T027 Configurar `frontend/src/app/app.config.ts`:
  - `provideRouter(routes, withComponentInputBinding())` e `provideHttpClient(withFetch())`.
  - `registerLocaleData(localePt)` e `{ provide: LOCALE_ID, useValue: 'pt-BR' }`.
  - Os providers da Taiga UI gerados pelo `ng add`.
  - Idioma português da Taiga UI (`TUI_LANGUAGE` com `TUI_PORTUGUESE_LANGUAGE` de
    `@taiga-ui/i18n/languages/portuguese`).
  - Detecção de mudanças zoneless.
- [X] T028 Criar o shell da aplicação:
  - `frontend/src/app/app.ts`/`app.html`: `tui-root`, cabeçalho "Cadastro de Candidatos" com
    link para `/candidatos` e `<router-outlet>`.
  - `frontend/src/app/app.routes.ts`: `''` → redirect `candidatos` (`pathMatch: 'full'`) e
    `'**'` → redirect `candidatos`. As histórias inserem suas rotas **antes** do `'**'`.
  - Atualizar `frontend/src/app/app.spec.ts` para o shell.
- [X] T029 [P] Criar `frontend/proxy.conf.json` (`/api` → `http://localhost:3000`) e
  referenciá-lo em `angular.json` (`serve.options.proxyConfig`).
- [X] T030 [P] Criar `frontend/nginx.conf` (R11):
  - `listen 80`, `root /usr/share/nginx/html` e `client_max_body_size 6m`.
  - `location /` com `try_files $uri $uri/ /index.html`.
  - `location /api/` com `proxy_pass http://backend:3000;`,
    `proxy_set_header Host $host;`,
    `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` e
    `proxy_read_timeout 30s;`.
  - `gzip on` para `text/css`, `application/javascript` e `application/json`.
- [X] T031 [P] Criar `frontend/Dockerfile` multi-stage:
  - `build`: `node:26.10-bookworm-slim` + `npm install -g pnpm@11.21.0`, depois
    `pnpm install --frozen-lockfile`, cópia do código e `pnpm build`.
  - `runtime`: `nginx:1.30-alpine`, copia `nginx.conf` para `/etc/nginx/conf.d/default.conf` e
    a saída do build (conferir o `outputPath` em `angular.json`; normalmente
    `dist/frontend/browser`) para `/usr/share/nginx/html`.
- [X] T032 Criar `docker-compose.yml` na raiz (tabela "Configuração dos containers" do
  [plan.md](./plan.md)):
  - **db**:
    - `image: mcr.microsoft.com/mssql/server:2025-latest` e `platform: linux/amd64`.
    - `environment`: `ACCEPT_EULA: "Y"`, `MSSQL_SA_PASSWORD: ${MSSQL_SA_PASSWORD}` e
      `MSSQL_PID: Developer`.
    - `ports: ["1433:1433"]` e `volumes: [mssql-data:/var/opt/mssql]`.
    - `healthcheck` com `CMD-SHELL`: tenta `/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa
      -P "$$MSSQL_SA_PASSWORD" -C -Q "SELECT 1" -b -o /dev/null` e, se o binário não existir,
      `/opt/mssql-tools/bin/sqlcmd` sem `-C`. `interval: 10s`, `timeout: 5s`, `retries: 12` e
      `start_period: 30s`.
  - **backend**:
    - `build: ./backend` e `ports: ["3000:3000"]`.
    - `environment` com `DB_HOST: db`, `DB_PORT: 1433` e, via `${...}`, `DB_NAME`, `DB_USER`,
      `DB_PASSWORD`, `LOG_LEVEL` e `PDF_EXTRACTION_TIMEOUT_MS`, mais `PORT: 3000`.
    - `depends_on: { db: { condition: service_healthy } }` e `restart: on-failure`.
  - **frontend**: `build: ./frontend`, `ports: ["4200:80"]` e
    `depends_on: { backend: { condition: service_healthy } }`.
  - `volumes: { mssql-data: {} }`.

**Checkpoint**: `cp .env.example .env && docker compose up --build`: o `db` e o `backend`
ficam `healthy`, o log registra a migration 0001, `curl localhost:3000/api/health` responde
ok e `http://localhost:4200` mostra o shell.

---

## Phase 3: User Story 1 - Cadastro manual de candidato (Priority: P1) 🎯 MVP

**Goal**: preencher o formulário, validar todos os campos com as regras do DM§2 e gravar o
candidato, com confirmação de sucesso e e-mail único.

**Independent Test**: em `/candidatos/novo`, salvar dados válidos e inválidos, sem PDF.
Confirmar que só os válidos geram "Candidato cadastrado com sucesso!", que um e-mail duplicado
mostra a mensagem de **UI** e que o registro existe no banco (`docker compose exec db ...
SELECT * FROM dbo.Candidates`). Corresponde ao passo 3 do [quickstart](./quickstart.md).

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T033 [P] [US1] Criar `backend/tests/unit/domain/candidate-input.schema.spec.ts` cobrindo
  **todos** os casos compartilhados do DM§2:
  - Nome só com espaços → `REQUIRED`.
  - Nome com 250 caracteres → válido; com 251 → `MAX_LENGTH`.
  - `maria@`, `maria.com` e `@x.com` → `INVALID_EMAIL`.
  - `"  maria@x.com "` → válido, normalizado para `maria@x.com`.
  - `(41) 99999-9999` → `41999999999`; `(41) 3333-4444` → `4133334444`.
  - `99999-9999`, `+55 41 99999-9999` e `41abc999999` → `INVALID_PHONE`.
  - Telefone `""` → `null`.
  - Resumo com 1000 caracteres → válido; com 1001 → `MAX_LENGTH`.
  - `Conceição` e resumo com `\n` → preservados.
  - Propriedade desconhecida → erro.
- [X] T034 [P] [US1] Criar `backend/tests/fakes/fake-candidate.repository.ts`, um
  `CandidateRepository` em memória que implementa `create`, `list` (ordem `createdAt` desc) e
  `findById`, e lança `EmailAlreadyExistsError` ao comparar e-mails sem diferenciar
  maiúsculas.
- [X] T035 [P] [US1] Criar `backend/tests/unit/services/candidate.service.spec.ts`
  (`describe('create')`) com o fake do T034:
  - Entrada válida → `repository.create` recebe o `NewCandidate` normalizado (trim, opcionais
    vazios → `null`, telefone só com dígitos).
  - Entrada inválida → `ValidationError` com `fields` e códigos corretos, sem chamar o
    repositório.
  - E-mail duplicado com outra caixa (`Maria@Email.com` depois de `maria@email.com`) →
    `EmailAlreadyExistsError`.
- [X] T036 [P] [US1] Criar `backend/tests/http/candidates.create.spec.ts` com supertest sobre
  `createApp` e o fake:
  - 201 com o header `Location: /api/candidates/{id}` e o corpo no schema `Candidate`.
  - 400 `VALIDATION_ERROR` com `fields[]`.
  - 409 `EMAIL_ALREADY_EXISTS` com `fields[0].field === 'email'`.
  - 400 para JSON malformado.
  - 400 para propriedade extra.
- [X] T037 [P] [US1] Criar
  `frontend/src/app/features/candidates/validation/candidate-validators.spec.ts` com os
  **mesmos** casos do T033, aplicados aos validadores Angular e a `normalizePhone`.
- [X] T038 [P] [US1] Criar
  `frontend/src/app/features/candidates/components/candidate-form/candidate-form.component.spec.ts`
  com o `CandidatesApiService` mockado:
  - Renderiza os 5 rótulos de **UI**.
  - Mostra a mensagem certa de **UI** ao perder o foco e ao tentar salvar.
  - Submissão inválida não chama a API.
  - Sucesso → alerta "Candidato cadastrado com sucesso!" e formulário limpo.
  - 400 → erros nos campos.
  - 409 → "Já existe um candidato com este e-mail." no campo E-mail, com os dados mantidos.
  - 500 → "Não foi possível salvar agora. Seus dados continuam no formulário; tente
    novamente." com os dados mantidos.
  - Dois cliques rápidos em Salvar → uma única chamada à API.
  - O botão Salvar só fica desabilitado enquanto um salvamento está em andamento.

### Implementation for User Story 1

- [X] T039 [US1] Criar `backend/src/domain/candidate-input.schema.ts` (zod, `strict()`) com
  as regras do DM§2, todas aplicadas depois do trim:
  - `fullName`: obrigatório, `1 a 250 caracteres` → `REQUIRED`, `MAX_LENGTH`.
  - `email`: obrigatório, `até 250 caracteres`, formato `local@domínio.tld` com
    `EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/` → `REQUIRED`,
    `MAX_LENGTH`, `INVALID_EMAIL`.
  - `phone`: opcional; aceita só `dígitos, ( ) espaço e -`; depois de normalizar, `10 ou 11
    dígitos` → `INVALID_PHONE`.
  - `areaOfInterest`: opcional, `até 250 caracteres`.
  - `professionalSummary`: opcional, `até 1000 caracteres`.
  - Opcionais vazios viram `null`.
  - Exportar `EMAIL_PATTERN`, `normalizePhone` e `parseCandidateInput(raw: unknown)`, que
    devolve `{ ok: true, value: NewCandidate } | { ok: false, fields: FieldError[] }` com as
    mensagens de **UI** ("Mensagens de validação").
- [X] T040 [P] [US1] Criar `backend/src/repositories/candidate.repository.ts` com a interface
  `CandidateRepository { create(c: NewCandidate): Promise<Candidate>; list():
  Promise<CandidateSummary[]>; findById(id: number): Promise<Candidate | null> }`.
- [X] T041 [US1] Criar `backend/src/repositories/mssql-candidate.repository.ts`
  (`MssqlCandidateRepository implements CandidateRepository`):
  - `create` com `INSERT INTO dbo.Candidates (...) OUTPUT INSERTED.* VALUES (...)` e
    parâmetros tipados: `sql.NVarChar(250)` para nome, e-mail e área; `sql.VarChar(11)` para o
    telefone; `sql.NVarChar(1000)` para o resumo.
  - Mapeia a linha para `Candidate`.
  - Converte `RequestError` com `number` 2627 ou 2601 em `EmailAlreadyExistsError`.
  - `list` e `findById` lançam `Error('não implementado: US2')` até o T057.
- [X] T042 [US1] Criar `backend/src/services/candidate.service.ts` (`CandidateService`, que
  recebe o `CandidateRepository` no construtor) com `create(raw: unknown):
  Promise<Candidate>`: chama `parseCandidateInput`, lança `ValidationError(fields)` se for
  inválido e senão chama `repository.create`.
- [X] T043 [US1] Criar `backend/src/controllers/candidates.controller.ts` com
  `createCandidatesRouter(service)` e `POST /` → 201, `Location: /api/candidates/{id}` e
  `toCandidateDto`. Depois:
  - Acrescentar `candidateService` a `AppDependencies` e montar o router em `/api/candidates`
    no `backend/src/app.ts`.
  - Instanciar `MssqlCandidateRepository` e `CandidateService` no `backend/src/server.ts`.
- [X] T044 [P] [US1] Criar
  `frontend/src/app/features/candidates/validation/validation-messages.ts`, o mapa `(campo,
  código) → texto` copiado **literalmente** da tabela "Mensagens de validação" de **UI**.
- [X] T045 [P] [US1] Criar
  `frontend/src/app/features/candidates/validation/candidate-validators.ts` com:
  - `EMAIL_PATTERN`, idêntico ao do T039.
  - Os validadores `requiredTrimmed`, `maxLengthTrimmed(n)`, `emailFormat` e `phoneBr`
    (caracteres permitidos e 10 ou 11 dígitos), que devolvem as chaves `REQUIRED`,
    `MAX_LENGTH`, `INVALID_EMAIL` e `INVALID_PHONE`.
  - `normalizePhone(value)`.
- [X] T046 [P] [US1] Criar `frontend/src/app/core/api/candidates-api.service.ts` com
  `create(input: CandidateInput): Observable<Candidate>` (`POST /api/candidates`).
- [X] T047 [US1] Criar `frontend/src/app/features/candidates/components/candidate-form/`
  (`.ts`, `.html`, `.scss`), standalone:
  - `FormGroup` tipado, `nonNullable`, com `fullName`, `email`, `phone`, `areaOfInterest` e
    `professionalSummary`.
  - Controles Taiga conforme a tabela "Formulário de cadastro" de **UI**: Maskito no
    telefone, alternando `(00) 0000-0000` e `(00) 00000-0000`; `tuiTextarea` com contador
    `n/1000`, `maxlength` nativo de 1000 e crescimento de 4 a 40 linhas (`[min]`/`[max]`).
  - Erros exibidos com `validation-messages.ts` quando o campo é tocado.
  - Sinal `saving`, com o botão Salvar desabilitado só enquanto `saving()` for verdadeiro.
  - Ao salvar: `markAllAsTouched`; se inválido, para. Senão, monta o `CandidateInput` (trim,
    opcionais vazios → `null`, `normalizePhone`) e chama `create` com proteção contra envio
    duplo (`exhaustMap` ou guarda por `saving`).
  - Respostas:
    - 201: `TuiNotificationService` com "Candidato cadastrado com sucesso!" e `form.reset()`.
    - 400: aplica os `fields` aos controles (`setErrors({ server: message })`).
    - 409: aplica o erro ao controle `email`.
    - Outros: alerta "Não foi possível salvar agora. Seus dados continuam no formulário;
      tente novamente.".
  - Deixar um slot, `<ng-content select="[resumeUpload]">` ou equivalente, acima dos campos,
    para a US3.
- [X] T048 [US1] Criar
  `frontend/src/app/features/candidates/pages/candidate-create-page/` (componente, template e
  `*.spec.ts`): título "Novo candidato", `CandidateFormComponent` e link "Ver candidatos" para
  `/candidatos`. Registrar a rota `candidatos/novo` com `loadComponent` em
  `frontend/src/app/app.routes.ts`. O spec verifica o título e a presença do formulário.

**Checkpoint**: a US1 funciona sozinha. O cadastro manual está completo, validado nos dois
lados e com o e-mail único garantido pelo banco.

---

## Phase 4: User Story 2 - Consulta de candidatos cadastrados (Priority: P2)

**Goal**: listar os candidatos do mais recente para o mais antigo e abrir os detalhes de cada
um, com estados de lista vazia, erro e candidato não encontrado.

**Independent Test**: com o banco vazio, ver a mensagem de lista vazia. Com candidatos
(cadastrados pela US1 ou via `POST /api/candidates`), conferir a ordem da lista, abrir os
detalhes em 1 clique e acessar `/candidatos/999999`. Corresponde ao passo 4 do
[quickstart](./quickstart.md).

### Tests for User Story 2 ⚠️

- [X] T049 [P] [US2] Acrescentar `describe('list')` e `describe('getById')` em
  `backend/tests/unit/services/candidate.service.spec.ts`:
  - `list` devolve os itens na ordem do repositório.
  - `getById('7')` devolve o candidato.
  - `getById('999')` sem registro → `CandidateNotFoundError`.
  - `getById('abc')`, `getById('0')` e `getById('-1')` → `CandidateNotFoundError`, sem chamar
    o repositório.
- [X] T050 [P] [US2] Criar `backend/tests/http/candidates.read.spec.ts` com supertest e o fake:
  - `GET /api/candidates` → 200 com `[]`; com dados, a ordem `createdAt` desc e só os campos
    de `CandidateSummary`.
  - `GET /api/candidates/{id}` → 200 com todos os campos e `createdAt` em ISO-8601.
  - `GET /api/candidates/999999` e `/api/candidates/abc` → 404 `CANDIDATE_NOT_FOUND` com a
    mensagem de **UI**.
- [X] T051 [P] [US2] Criar
  `frontend/src/app/features/candidates/data/candidates.store.spec.ts`:
  - `loadList`: `loading` → `loaded` com os itens; `error` quando a API falha; `isEmpty`
    verdadeiro com `[]`.
  - `loadById`: `loaded` com o candidato; `not-found` em 404; `error` nos outros casos.
- [X] T052 [P] [US2] Criar `frontend/src/app/shared/pipes/phone-format.pipe.spec.ts`:
  `'41999999999'` → `'(41) 99999-9999'`; `'4133334444'` → `'(41) 3333-4444'`; `null` → `''`.
- [X] T053 [P] [US2] Criar
  `frontend/src/app/features/candidates/components/candidate-table/candidate-table.component.spec.ts`:
  - Colunas "Nome", "E-mail", "Área ou cargo de interesse" e "Cadastrado em", com a data no
    formato `dd/MM/yyyy HH:mm`.
  - Área `null` → "Não informado".
  - Cada linha tem link para `/candidatos/{id}` e é acessível pelo teclado.
- [X] T054 [P] [US2] Criar
  `frontend/src/app/features/candidates/components/candidate-details/candidate-details.component.spec.ts`:
  - Mostra todos os campos e "Cadastrado em".
  - Telefone formatado.
  - Opcionais `null` → "Não informado".
  - O resumo preserva as quebras de linha.
- [X] T055 [P] [US2] Criar
  `frontend/src/app/features/candidates/pages/candidate-list-page/candidate-list-page.component.spec.ts`
  com o store mockado:
  - Lista vazia → "Nenhum candidato cadastrado ainda." e o botão "Cadastrar o primeiro
    candidato".
  - Erro → "Não foi possível carregar os candidatos. Tente novamente." e o botão "Tentar de
    novo", que chama `loadList`.
  - O botão "Novo candidato" leva a `/candidatos/novo`.
- [X] T056 [P] [US2] Criar
  `frontend/src/app/features/candidates/pages/candidate-detail-page/candidate-detail-page.component.spec.ts`:
  - `not-found` → "Candidato não encontrado. Ele pode não existir ou o link está incorreto." e
    o botão "Voltar para a lista".
  - `loaded` → renderiza `CandidateDetailsComponent`.

### Implementation for User Story 2

- [X] T057 [US2] Implementar, em `backend/src/repositories/mssql-candidate.repository.ts`:
  - `list()`: `SELECT Id, FullName, Email, AreaOfInterest, CreatedAt FROM dbo.Candidates
    ORDER BY CreatedAt DESC, Id DESC`.
  - `findById(id)`: `SELECT ... WHERE Id = @id`, com `sql.Int`; devolve `null` se não houver
    linha.
- [X] T058 [US2] Acrescentar a `backend/src/services/candidate.service.ts`:
  - `list(): Promise<CandidateSummary[]>`.
  - `getById(rawId: string): Promise<Candidate>`: aceita só `^[1-9][0-9]*$` e lança
    `CandidateNotFoundError` para id inválido ou inexistente.
- [X] T059 [US2] Acrescentar `GET /` (`toCandidateSummaryDto[]`) e `GET /:id`
  (`toCandidateDto`) em `backend/src/controllers/candidates.controller.ts`.
- [X] T060 [P] [US2] Acrescentar `list(): Observable<CandidateSummary[]>` e
  `getById(id: number): Observable<Candidate>` em
  `frontend/src/app/core/api/candidates-api.service.ts`.
- [X] T061 [US2] Criar `frontend/src/app/features/candidates/data/candidates.store.ts`
  (`providedIn: 'root'`) com:
  - Sinais `items`, `listStatus` (`'idle' | 'loading' | 'loaded' | 'error'`), `selected` e
    `detailStatus` (`'idle' | 'loading' | 'loaded' | 'not-found' | 'error'`).
  - `computed` `isEmpty`.
  - Métodos `loadList()` e `loadById(id: number)`, que usam `toApiError`.
- [X] T062 [P] [US2] Criar `frontend/src/app/shared/pipes/phone-format.pipe.ts` (pure,
  standalone).
- [X] T063 [P] [US2] Criar
  `frontend/src/app/features/candidates/components/candidate-table/` com `tuiTable`, as
  colunas do T053 e linhas com `routerLink` para `/candidatos/{id}` (SC-007: 1 clique),
  acessíveis pelo teclado.
- [X] T064 [P] [US2] Criar
  `frontend/src/app/features/candidates/components/candidate-details/`: lista de definição
  com os 5 campos e "Cadastrado em" (`date: 'dd/MM/yyyy HH:mm'`), telefone com
  `phoneFormat`, "Não informado" para `null` e `white-space: pre-line` no resumo.
- [X] T065 [US2] Criar `frontend/src/app/features/candidates/pages/candidate-list-page/`:
  - Chama `store.loadList()` ao iniciar e mostra o loader em `loading`.
  - `CandidateTableComponent` quando há itens.
  - `tui-block-status` para lista vazia e para erro, com os textos e botões de **UI**.
  - Botão "Novo candidato".
  - Registrar a rota `candidatos` em `app.routes.ts`.
- [X] T066 [US2] Criar `frontend/src/app/features/candidates/pages/candidate-detail-page/`:
  - Recebe `id` como input da rota (`withComponentInputBinding`) e chama
    `store.loadById(+id)`.
  - Mostra os estados `loading`, `not-found` e `error` com os textos de **UI** e o botão
    "Voltar para a lista".
  - Registrar `candidatos/:id` em `app.routes.ts` **depois** de `candidatos/novo`.

**Checkpoint**: US1 e US2 funcionam de forma independente. O que é cadastrado aparece na
listagem sem outra ação.

---

## Phase 5: User Story 3 - Pré-preenchimento a partir de currículo em PDF (Priority: P3)

**Goal**: anexar um PDF ao formulário, extrair Nome, E-mail e Telefone no servidor e preencher
só os campos vazios, com mensagens claras para cada falha. O cadastro manual nunca fica
bloqueado.

**Independent Test**: com os PDFs de `samples/`, conferir o preenchimento e cada mensagem de
**UI**. Depois de cada falha, concluir o cadastro manualmente. Corresponde ao passo 5 do
[quickstart](./quickstart.md).

### Sample assets (pré-requisito dos testes da US3)

- [X] T067 [US3] Criar `samples/generate-samples.mjs` (pdfkit, fonte Helvetica, dados
  **fictícios**, domínios `example.*`), que gera os arquivos do R16:
  - `01-layout-simples.pdf`, com as linhas:
    - "Conceição Aparecida da Silva"
    - "Rua das Flores, 123 - Curitiba/PR - CEP 80010-000"
    - "E-mail: conceicao.silva@example.com | Tel.: (41) 99876-5432"
    - "CPF: 123.456.789-09"
    - "Resumo profissional"
    - uma frase de resumo
  - `02-duas-colunas.pdf`:
    - coluna em x=40 com "CONTATO", "+55 41 3333-4444" e "joao.pereira@example.org";
    - coluna em x=230 com "JOÃO PEREIRA" (negrito, 22pt) e "Desenvolvedor Full Stack".
  - `03-sem-telefone.pdf`: "Ana Beatriz Costa" e "ana.costa@example.com", sem telefone.
  - `04-rotulo-nome.pdf`: "Currículo", "Nome completo: Pedro Henrique Alves",
    "E-mail: pedro.alves@example.net" e "Celular: 41 91234-5678".
  - `05-digitalizado-sem-texto.pdf`: só retângulos desenhados, sem nenhum texto.
  - `06-protegido-por-senha.pdf`: conteúdo do 01, com `userPassword: 'segredo'`.
  - `07-corrompido.pdf`: o primeiro terço dos bytes do 01.
  - `08-nao-e-pdf.pdf`: bytes `PK\x03\x04` seguidos de texto qualquer.

  Rodar `pnpm samples:generate` na raiz e versionar os PDFs.
- [X] T068 [US3] Criar `samples/expected.json`, o manifesto legível por máquina:
  - Para 01 a 04, os `fields` esperados:
    - 01: `Conceição Aparecida da Silva` / `conceicao.silva@example.com` / `41998765432`.
    - 02: `João Pereira` / `joao.pereira@example.org` / `4133334444`.
    - 03: `Ana Beatriz Costa` / `ana.costa@example.com` / `null`.
    - 04: `Pedro Henrique Alves` / `pedro.alves@example.net` / `41912345678`.
  - Para 05 a 08, o erro esperado:
    - 05: `422 no_text`.
    - 06: `422 encrypted`.
    - 07: `422 corrupted`.
    - 08: `415 INVALID_FILE_TYPE`.

  Criar também `samples/README.md` com a mesma tabela, em formato legível, e a nota de que os
  dados são fictícios.

### Tests for User Story 3 ⚠️

- [X] T069 [P] [US3] Criar `backend/tests/fixtures/resume-texts.ts` e
  `backend/tests/unit/extraction/resume-field-parser.spec.ts`, cobrindo o R4:
  - **E-mail**: com dois e-mails no texto, usa o primeiro.
  - **Telefone**:
    - `(41) 99876-5432` → `41998765432`.
    - `+55 41 3333-4444` → `4133334444`.
    - `CPF: 123.456.789-09` e `CPF 12345678909` são ignorados.
    - `CEP 80010-000` é ignorado.
    - `(41) 81234-5678` (11 dígitos sem 9 no terceiro) é descartado.
  - **Nome**:
    - `Nome completo: Pedro Henrique Alves` usa o rótulo.
    - As linhas "Currículo" e "CONTATO" são ignoradas.
    - `JOÃO DA SILVA` → `João da Silva`.
    - Nome com mais de 250 caracteres → `null`.
  - Texto sem nenhum dado → os três campos `null`.
- [X] T070 [P] [US3] Criar
  `backend/tests/unit/services/resume-extraction.service.spec.ts` com um `PdfTextExtractor`
  falso e um logger espião:
  - Sem arquivo → `FileRequiredError`.
  - Buffer sem `%PDF-` nos primeiros 1024 bytes → `InvalidFileTypeError`.
  - Texto vazio ou só espaços → `PdfUnreadableError('no_text')`.
  - Extrator lança `PdfExtractionError('encrypted')` → `PdfUnreadableError('encrypted')`.
  - Extrator lança `PdfExtractionError('corrupted')` → `PdfUnreadableError('corrupted')`.
  - Extrator que nunca resolve, com timeout de 50 ms → `PdfUnreadableError('timeout')`.
  - Sucesso parcial → `identified` e `notIdentified` corretos e `pagesRead` repassado.
  - Os logs **não** contêm nenhum valor de campo nem o texto extraído.
- [X] T071 [P] [US3] Criar `backend/tests/integration/unpdf-text-extractor.spec.ts`, que lê os
  arquivos de `../samples/`:
  - 01: o texto começa pela linha do nome.
  - 05: texto vazio.
  - 06: lança `PdfExtractionError` com o motivo `encrypted`.
  - 07: lança com o motivo `corrupted`.
  - Para 01 a 04, rodar o `ResumeExtractionService` real (com `UnpdfTextExtractor`) e comparar
    com `samples/expected.json` (SC-002).
- [X] T072 [P] [US3] Criar `backend/tests/http/resume-extractions.spec.ts` com supertest,
  usando `createApp` com o service real e o `UnpdfTextExtractor`:
  - `samples/01` → 200 no schema `ResumeExtractionResult`.
  - Sem o campo `file` → 400 `FILE_REQUIRED`.
  - Buffer de **5.242.881 bytes** começando com `%PDF-` → 413 `FILE_TOO_LARGE`.
  - Buffer de **exatamente 5.242.880 bytes** → não recebe 413.
  - `samples/08` → 415.
  - `samples/05`, `06` e `07` → 422, com o `reason` correspondente.
- [X] T073 [P] [US3] Criar
  `frontend/src/app/features/candidates/components/resume-upload/resume-upload.component.spec.ts`:
  - Arquivo `.docx` ou `image/jpeg` → "Formato não aceito. Envie o currículo em PDF.", sem
    emitir.
  - `File` com mais de 5.242.880 bytes → "O arquivo tem mais de 5 MB. Envie um PDF de até
    5 MB.", sem emitir.
  - PDF válido → emite `fileSelected`.
  - Remover o arquivo → emite `fileRemoved`.
- [X] T074 [P] [US3] Acrescentar `describe('currículo PDF')` em
  `frontend/src/app/features/candidates/components/candidate-form/candidate-form.component.spec.ts`,
  com o `ResumeExtractionApiService` mockado:
  - Em `processing`: mostra "Lendo o currículo... Você pode continuar preenchendo o
    formulário.", os campos continuam editáveis e Salvar continua habilitado.
  - Com 200: preenche só os campos vazios (um nome já digitado é mantido) e marca "Preenchido
    pelo currículo". A marcação some quando o usuário edita o campo.
  - Mensagens de **UI** para:
    - `notIdentified` com 1 campo ("Não encontramos o telefone no currículo. Preencha
      manualmente.") e com 2 campos ("o nome e o telefone").
    - Nenhum campo identificado.
    - 413, 415 e cada `reason` de 422.
  - Salvar durante `processing` cancela a requisição e ignora o resultado que chegar depois.
  - Remover o arquivo mantém os valores já preenchidos.

### Implementation for User Story 3

- [X] T075 [P] [US3] Criar `backend/src/extraction/pdf-text-extractor.ts` (R3, R17) com:
  - A interface `PdfTextExtractor { extract(data: Uint8Array, opts: { maxPages: number }):
    Promise<{ text: string; pagesRead: number }> }`.
  - `PdfExtractionError(reason: 'encrypted' | 'corrupted')`.
  - `UnpdfTextExtractor`, que:
    - Abre o documento com `getDocumentProxy` do `unpdf`.
    - Lê `min(numPages, maxPages)` páginas com `page.getTextContent()`, juntando `item.str` e
      acrescentando `\n` quando `item.hasEOL`.
    - Converte o erro `name === 'PasswordException'` em `encrypted`, e
      `InvalidPDFException`, `FormatError` e `UnknownErrorException` em `corrupted`.
    - Chama `pdf.destroy()` num `finally`.
- [X] T076 [P] [US3] Criar `backend/src/extraction/resume-field-parser.ts` com
  `parseResumeFields(text): { fullName: string | null; email: string | null; phone: string |
  null }`, implementando **exatamente** as regras de E-mail, Telefone e Nome do R4.
  Reutilizar `EMAIL_PATTERN`, `normalizePhone` e os limites de `candidate-input.schema.ts`,
  para que um valor extraído só seja devolvido se passar nas regras do campo (FR-019).
- [X] T077 [US3] Criar `backend/src/services/resume-extraction.service.ts`
  (`ResumeExtractionService(extractor, logger, { timeoutMs, maxPages: 5 })`) com
  `extract(file?: { buffer: Buffer; size: number }): Promise<ResumeExtractionResult>`:
  1. Sem arquivo → `FileRequiredError`.
  2. Sem `%PDF-` em `buffer.subarray(0, 1024)` → `InvalidFileTypeError`.
  3. Chama o extrator com `Promise.race` contra o timeout → `PdfUnreadableError('timeout')`.
  4. Converte `PdfExtractionError` em `PdfUnreadableError(reason)`.
  5. Texto vazio depois do trim → `PdfUnreadableError('no_text')`.
  6. Chama `parseResumeFields` e monta `{ fields, identified, notIdentified, pagesRead }`.
  7. Registra no log `{ outcome, reason?, identified, pagesRead, durationMs }`, **sem**
     valores. Não guarda nenhuma referência ao buffer (FR-024).
- [X] T078 [US3] Criar `backend/src/http/pdf-upload.ts` com `pdfUpload`:
  - Base: `multer({ storage: multer.memoryStorage(), limits: { fileSize: 5_242_880,
    files: 1 } }).single('file')`.
  - O wrapper converte `MulterError` `LIMIT_FILE_SIZE` em `FileTooLargeError`, e
    `LIMIT_UNEXPECTED_FILE` ou `LIMIT_FILE_COUNT` em `FileRequiredError`.
- [X] T079 [US3] Criar `backend/src/controllers/resume-extractions.controller.ts` com
  `POST /` → `pdfUpload` → `service.extract(req.file)` → 200. Depois:
  - Acrescentar `resumeExtractionService` a `AppDependencies` e montar o router em
    `/api/resume-extractions` no `backend/src/app.ts`.
  - Instanciar `UnpdfTextExtractor` e `ResumeExtractionService` (com
    `PDF_EXTRACTION_TIMEOUT_MS`) no `backend/src/server.ts`.
- [X] T080 [P] [US3] Criar `frontend/src/app/core/api/resume-extraction-api.service.ts` com
  `extract(file: File): Observable<ResumeExtractionResult>` (`POST
  /api/resume-extractions`, `FormData` com o campo `file`).
- [X] T081 [P] [US3] Criar
  `frontend/src/app/features/candidates/components/resume-upload/` com:
  - `label[tuiInputFiles]` com `accept="application/pdf,.pdf"` e um arquivo por vez; o arquivo
    escolhido aparece em `<tui-files>`/`<tui-file>`.
  - Checagens no navegador: tipo `application/pdf` ou extensão `.pdf`, e tamanho ≤ 5.242.880
    bytes, com as mensagens de **UI**.
  - Saídas `fileSelected(File)` e `fileRemoved()`.
- [X] T082 [US3] Integrar o upload ao `CandidateFormComponent`
  (`frontend/src/app/features/candidates/components/candidate-form/`), conforme o DM§4:
  - Sinais `extractionStatus` (`'idle' | 'processing' | 'applied' | 'failed' | 'rejected'`) e
    `autofilled` (`Set<ResumeField>`).
  - Ao receber `fileSelected`: vai para `processing` e chama `extract` via `switchMap`,
    cancelando em `fileRemoved` ou ao salvar.
  - Com o resultado, aplica **só** nos controles vazios, marca `autofilled` e mostra a
    mensagem de **UI**. A lista de campos faltantes usa "o nome", "o e-mail" e "o telefone",
    unidos por ", " e " e ".
  - Um `valueChanges` do usuário remove o campo de `autofilled`.
  - Erros: `toApiError` e a mensagem pelo `code`/`reason`.
  - A área de status usa `aria-live="polite"`.
  - Salvar continua habilitado durante o processamento (FR-021, FR-023).

**Checkpoint**: todas as histórias funcionam de forma independente. O PDF só acelera o
cadastro e nunca o bloqueia.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: documentação obrigatória, gates da constituição e validação final.

- [X] T083 [P] Escrever o `README.md` (plan.md, "Documentação a gerar"):
  1. Visão geral e tabela de tecnologias e versões: Node 26.10, Angular 22.2, Taiga UI 5.26,
     SQL Server 2025, TypeScript 6.0.3, pnpm 11.21, unpdf 1.8.1.
  2. Pré-requisitos: Docker Compose v2; host x86_64 ou emulação no ARM.
  3. `git clone` e `cp .env.example .env`.
  4. `docker compose up --build` (o comando legado `docker-compose` também funciona), com as
     URLs: 4200 (app), 3000 (API) e 1433 (banco).
  5. Roteiro Docker **só do backend**: rede, `docker run` do SQL Server,
     `docker build -t cieepr-backend ./backend` e `docker run --env-file .env -e DB_HOST=...
     -p 3000:3000`.
  6. Roteiro Docker **só do frontend**: `docker build -t cieepr-frontend ./frontend` e
     `docker run -p 4200:80`, com a nota de que o proxy espera um host `backend`.
  7. Teste com `samples/`, apontando para `samples/README.md`.
  8. Testes (`pnpm test` em cada app).
  9. Release (`pnpm release:dry`; o fluxo `dev` → PR → `main`).
  10. Troubleshooting: senha fraca do SA, porta em uso, host ARM, caminho do `sqlcmd`.
- [X] T084 [P] Completar o `DESENVOLVIMENTO.md` (a partir do T011):
  - Seção 2: decisões R1 a R17 resumidas, com links para o `research.md`.
  - Seções 4 e 5: prompts e ajustes feitos durante a implementação.
  - Seção 6: o resultado do T088.
  - Seção 8: as limitações da extração observadas nos logs e nos samples, e as melhorias
    (login, OCR, `worker_threads`, usuário de banco dedicado, tag fixa do SQL Server, pacote
    de validação compartilhado, NER para nomes).
- [X] T085 Confirmar o caminho do `sqlcmd` na imagem (`docker compose exec db ls
  /opt/mssql-tools18/bin/sqlcmd`) e simplificar o healthcheck de `docker-compose.yml` para o
  caminho real. Registrar o resultado em `DESENVOLVIMENTO.md`, seção 5.
- [X] T086 [P] Revisão de acessibilidade nos componentes de `frontend/src/app/features/
  candidates/`:
  - Todo campo tem rótulo associado.
  - Erros associados ao campo por `aria-errormessage` + `aria-invalid` (a Taiga sobrescreve o
    `aria-describedby`).
  - Status da extração com `aria-live`.
  - Linhas da tabela acessíveis por Tab e Enter.
- [X] T087 [P] Revisão de segurança:
  - `git grep -nE "Passw0rd|password=" -- ':!.env.example' ':!specs/**'` não encontra
    segredos.
  - Os logs de extração não contêm dados pessoais (conferir com `docker compose logs backend`
    depois de enviar `samples/01`).
  - `x-powered-by` desativado.
  - Nenhum arquivo gravado em disco no upload (quickstart, FR-024).
- [X] T088 Rodar os gates da constituição e o [quickstart.md](./quickstart.md) completo,
  passos 1 a 8:
  - `pnpm build && pnpm test` em `backend/` e em `frontend/`.
  - `docker compose up --build` a partir de um `.env` recém-copiado.
  - Todas as tabelas de verificação do quickstart.

  Corrigir as falhas encontradas e registrar as evidências em `DESENVOLVIMENTO.md`, seção 6.
- [X] T089 Revisar a checklist de merge (gates 1 a 6 de "Development Workflow & Quality
  Gates" da constituição) e preparar a descrição do PR `dev` → `main`, que deve ser integrado
  com **merge commit**. A abertura do PR fica a cargo do autor.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: depende do T005 (backend), do T006 (frontend) e do T007
  (`.env.example`). BLOCKS all user stories.
- **US1 (Phase 3)**: depende da Fase 2.
- **US2 (Phase 4)**: depende da Fase 2. No backend, usa a interface do repositório (T040) e o
  fake (T034) criados na US1. Se a US2 for feita antes, crie esses dois arquivos no início da
  US2. Não depende do formulário da US1.
- **US3 (Phase 5)**: depende da Fase 2 e do `CandidateFormComponent` (T047), porque o upload é
  integrado ao mesmo formulário (FR-001), e do `candidate-input.schema.ts` (T039), reutilizado
  pelo parser. O backend da US3 (T067 a T072 e T075 a T079) pode avançar em paralelo à US1
  depois do T039.
- **Polish (Phase 6)**: depende das histórias desejadas.

### User Story Dependencies

- **User Story 1 (P1)**: pode começar depois da Fase 2 e não depende de outras histórias.
- **User Story 2 (P2)**: pode começar depois da Fase 2. Os únicos artefatos compartilhados com
  a US1 são a interface do repositório e o fake. Pode ser testada sozinha, com dados inseridos
  via API.
- **User Story 3 (P3)**: estende o formulário da US1 e continua testável sozinha: o endpoint
  de extração tem testes próprios e o formulário funciona sem PDF.

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Schema e tipos antes dos services; services antes dos controllers; API services antes dos
  componentes; componentes antes das páginas e rotas.
- `app.ts`, `server.ts` e `app.routes.ts` são editados em várias histórias. Essas tarefas não
  têm [P] e devem ser feitas em sequência.

### Parallel Opportunities

- **Fase 1**: T003, T005, T006, T007, T008, T009, T010 e T011 em paralelo. T001 → T002 em
  sequência, e o T004 depende do T001, do T002 e do T003.
- **Fase 2**: T012 a T015, T022 a T026 e T029 a T031 em paralelo. T016 → T017 → T018 → T020 →
  T021 em sequência. T027 → T028 em sequência.
- **US1**: todos os testes (T033 a T038) em paralelo. Depois, T040, T044, T045 e T046 em
  paralelo.
- **US2**: todos os testes (T049 a T056) em paralelo. Depois, T060, T062, T063 e T064 em
  paralelo.
- **US3**: T069 a T074 em paralelo depois do T067 e do T068. Depois, T075, T076, T080 e T081
  em paralelo.
- **Entre histórias**: o backend da US2 e o backend da US3 podem andar em paralelo ao
  frontend da US1.

---

## Parallel Example: User Story 1

```bash
# Testes da US1, todos em arquivos diferentes:
Task: "T033 candidate-input.schema.spec.ts (casos do DM§2)"
Task: "T034 fake-candidate.repository.ts"
Task: "T035 candidate.service.spec.ts (create)"
Task: "T036 candidates.create.spec.ts (supertest)"
Task: "T037 candidate-validators.spec.ts (mesmos casos do T033)"
Task: "T038 candidate-form.component.spec.ts"

# Depois do T039 (schema), em paralelo:
Task: "T040 candidate.repository.ts (interface)"
Task: "T044 validation-messages.ts"
Task: "T045 candidate-validators.ts"
Task: "T046 candidates-api.service.ts (create)"
```

## Parallel Example: User Story 2

```bash
Task: "T051 candidates.store.spec.ts"
Task: "T052 phone-format.pipe.spec.ts"
Task: "T053 candidate-table.component.spec.ts"
Task: "T054 candidate-details.component.spec.ts"
# ...e depois:
Task: "T062 phone-format.pipe.ts"
Task: "T063 candidate-table component"
Task: "T064 candidate-details component"
```

## Parallel Example: User Story 3

```bash
# Depois do T067 e do T068 (samples):
Task: "T069 resume-field-parser.spec.ts"
Task: "T070 resume-extraction.service.spec.ts"
Task: "T071 unpdf-text-extractor.spec.ts"
Task: "T073 resume-upload.component.spec.ts"
# Implementação em paralelo:
Task: "T075 pdf-text-extractor.ts"
Task: "T076 resume-field-parser.ts"
Task: "T080 resume-extraction-api.service.ts"
Task: "T081 resume-upload component"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: rodar o passo 3 do quickstart. O cadastro manual já é uma entrega
   funcional.
5. Commit em `dev` (`feat: ...`).

### Incremental Delivery

1. Setup + Foundational → o ambiente Docker sobe com o health ok.
2. US1 → cadastro manual (MVP) → commit `feat`.
3. US2 → listagem e detalhes → commit `feat`.
4. US3 → pré-preenchimento por PDF → commit `feat`.
5. Polish → README, DESENVOLVIMENTO e gates → PR `dev` → `main` com merge commit. O
   semantic-release publica a 1.0.0.

### Parallel Team Strategy

Com mais de uma pessoa, depois da Fase 2:
- Pessoa A: frontend da US1, depois frontend da US3.
- Pessoa B: backend da US2 e frontend da US2.
- Pessoa C: samples e backend da US3 (extrator, parser, service, endpoint).

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commits em `dev` seguindo Conventional Commits (`feat`, `fix`, `test`, `docs`, `chore`...);
  o commitlint bloqueia mensagens fora do padrão.
- Atualizar as seções 4 e 5 do `DESENVOLVIMENTO.md` ao fim de cada fase (constituição, VII).
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
