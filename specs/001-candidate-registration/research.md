# Research: Cadastro e Consulta de Candidatos

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data**: 2026-09-29

Cada decisão segue o formato Decision / Rationale / Alternatives considered. As versões foram
conferidas nos registries (Docker Hub, MCR, npm) em 2026-09-29.

---

## R1. Imagem do Node.js e instalação do pnpm

**Decision**: `node:26.10-bookworm-slim` (Node 26.10.0) em todos os estágios Node dos
Dockerfiles. O pnpm é instalado com `npm install -g pnpm@11.21.0`, e a mesma versão fica fixada
no campo `packageManager` de cada `package.json`. As instalações usam
`pnpm install --frozen-lockfile`.

**Rationale**:
- A tag pedida existe no Docker Hub (a variante `trixie-slim` também existe, mas foi mantida a
  pedida).
- A partir do Node 25, o **Corepack deixou de vir junto com o Node**. O Dockerfile oficial de
  `26/bookworm-slim` não o menciona, então `corepack enable` não funciona nessa imagem. A
  constituição cita o Corepack só como exemplo ("ex.: via Corepack").
- O pnpm fica em 11.21.0, a mesma versão do ambiente local do autor, para que os lockfiles
  gerados localmente sejam aceitos com `--frozen-lockfile` dentro do Docker.

**Alternatives considered**:
- Corepack: indisponível no Node 26.
- pnpm 12.8.1 (latest): exigiria atualizar o ambiente local antes e arriscaria diferenças de
  lockfile. Pode ser atualizado depois, junto nos três projetos.
- `trixie-slim`: não foi o pedido. Não há ganho funcional para esta feature.

---

## R2. Framework HTTP do backend

**Decision**: Express 5.2.1 com `multer` 2.4.0 para o upload multipart, `zod` 4.6.5 para
validar os payloads e `pino` 10 para logs estruturados.

**Rationale**:
- O Express 5 tem suporte nativo a handlers `async` (erros rejeitados chegam ao middleware de
  erro) e é o framework Node mais conhecido por quem vai avaliar o código.
- As camadas Controller → Service → Repository ficam explícitas no código, sem a "mágica" de
  um framework, o que deixa o Princípio V fácil de auditar.
- O multer com `memoryStorage` e `limits.fileSize = 5_242_880` guarda o arquivo só em memória e
  nunca em disco, o que cumpre o FR-024 (descarte), e gera o erro `LIMIT_FILE_SIZE`, que vira o
  HTTP 413.
- O zod 4 descreve as regras de campo em um único schema tipado, e o tipo de entrada é inferido
  dele.

**Alternatives considered**:
- Fastify 5 + `@fastify/multipart`: tipagem nativa melhor e JSON Schema embutido, mas menos
  familiar, e o ganho de performance não importa na escala da spec.
- NestJS: impõe as camadas por convenção, mas é pesado (decorators, DI container, CLI) para 3
  endpoints e esconderia a separação de camadas que a constituição pede para mostrar.

---

## R3. Biblioteca de extração de texto do PDF

**Decision**: `unpdf` 1.8.1 (MIT, sem dependências, 2,1 MB), que usa o build serverless do
pdf.js da Mozilla. Ela fica isolada atrás da interface `PdfTextExtractor`, e a única
implementação concreta é `UnpdfTextExtractor`.

**Rationale**: fiz um spike em 2026-09-29 (Node 24.21) com seis PDFs gerados para o teste:

| Arquivo de teste       | unpdf                                            | pdf2json 4.1.0                                   |
|------------------------|--------------------------------------------------|--------------------------------------------------|
| Uma coluna             | Texto na ordem de leitura (nome na 1ª linha)     | Linhas em **ordem inversa** (de baixo para cima) |
| Duas colunas           | Coluna lateral e depois a principal, na ordem    | Ordem embaralhada                                |
| Só imagem (escaneado)  | Texto vazio (`""`)                               | Só o marcador de quebra de página                |
| Protegido por senha    | `PasswordException` tipada                       | Erro em string e stack trace no console          |
| Corrompido / truncado  | `InvalidPDFException` tipada                     | Erro em string e stack trace no console          |
| Falso (ZIP como .pdf)  | `InvalidPDFException` tipada                     | Erro em string e stack trace no console          |

- A heurística do nome depende da ordem de leitura (R4). O `pdf2json` inverte essa ordem.
- As exceções tipadas do pdf.js permitem mapear cada falha para o motivo certo da mensagem
  (`encrypted`, `corrupted`, `no_text`) sem analisar o texto do erro.
- É a opção mais leve das avaliadas.

**Alternatives considered**:
- `pdf-parse` 2.4.5: depende de `pdfjs-dist` e de **`@napi-rs/canvas` (binário nativo)**,
  21,3 MB, sem release desde 2025-10. Não é "leve" e traz um binário nativo sem necessidade.
- `pdf2json` 4.1.0: sem dependências e mantido (2026-09), mas tem os problemas de ordem de
  leitura e de erros mostrados acima.
- `pdfjs-dist` direto: é o mesmo motor da `unpdf`, mas exige configurar o worker e o polyfill à
  mão. A `unpdf` já faz isso.

---

## R4. Heurísticas de identificação de Nome, E-mail e Telefone

**Decision**: um parser puro, `ResumeFieldParser`, que recebe o texto e devolve os valores
sugeridos. Ele não faz I/O e é testável com strings fixas. Só as **5 primeiras páginas** são
lidas.

- **E-mail**: primeira ocorrência de
  `[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}`, com espaços removidos. Só é usada se
  passar na mesma validação do formulário, com no máximo 250 caracteres (FR-019).
- **Telefone**:
  1. Procura trechos com formato de telefone:
     `(?:\+?55[\s.-]?)?\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}`, sem dígito colado antes ou
     depois.
  2. Descarta trechos precedidos pelos rótulos `CPF`, `CEP`, `RG` ou `CNPJ`, e trechos no
     formato de CPF (`ddd.ddd.ddd-dd`).
  3. Normaliza para só dígitos. Se tiver 12 ou 13 dígitos começando com `55`, remove o código do
     país.
  4. Aceita só 10 ou 11 dígitos, com DDD de 11 a 99. Com 11 dígitos, o terceiro dígito precisa
     ser `9` (celular).
- **Nome**:
  1. Se houver uma linha com rótulo (`Nome:` ou `Nome completo:`), usa o valor depois do rótulo.
  2. Senão, usa a primeira linha, na ordem de leitura, que tenha de 2 a 6 palavras, só letras
     (com acentos), espaços, hífen, apóstrofo ou ponto, sem `@` nem dígitos, e que não esteja na
     lista de títulos de seção (currículo, curriculum vitae, resumo, contato, dados pessoais,
     objetivo, experiência, formação...).
  3. Nome todo em maiúsculas vira "título", mantendo as partículas `da`, `de`, `do`, `das`,
     `dos` e `e` em minúsculas (ex.: `JOÃO DA SILVA` → `João da Silva`).
- Um valor que não passa na regra do campo é descartado e o campo fica "não identificado".

**Rationale**: cobre os layouts comuns de currículo brasileiro. Como a lógica é pura, os casos
de borda da spec (CPF, CEP, +55, várias ocorrências, maiúsculas) viram testes unitários
simples. Ler só 5 páginas limita o tempo de processamento (SC-003) sem perder informação,
porque os dados de contato ficam quase sempre na primeira página.

**Alternatives considered**:
- NER/LLM para achar o nome: mais preciso, mas acrescenta dependência externa, custo e latência
  fora do escopo. Fica registrado como melhoria futura no `DESENVOLVIMENTO.md` (seção 8).
- `libphonenumber-js`: validação completa de telefone, mas pesada para um único país e para as
  regras simples do FR-004.

---

## R5. Acesso ao SQL Server

**Decision**: driver `mssql` 12.7.2 (baseado no `tedious`) com SQL parametrizado escrito à mão
nos repositórios, e um único `ConnectionPool` compartilhado.

**Rationale**:
- São uma tabela e três consultas. Um ORM acrescentaria mais do que resolve.
- Com parâmetros tipados (`sql.NVarChar(250)`), não há risco de SQL injection.
- A violação de unicidade (erros 2627 e 2601) é identificada pelo número do erro e convertida
  em `EmailAlreadyExistsError` no repositório. Assim, o service não conhece SQL (Princípio V).

**Alternatives considered**:
- Prisma, TypeORM, Drizzle: exigiriam um schema próprio em vez dos "Scripts SQL" pedidos.
- Knex: um query builder que não é necessário para três consultas fixas.

---

## R6. Migrations e inicialização do banco

**Decision**: arquivos `.sql` versionados em `backend/db/migrations/NNNN_descricao.sql`. O
próprio backend os executa **na inicialização do container**, antes de aceitar requisições:

1. Conecta no `master`, com novas tentativas e backoff por até 60 s.
2. Cria o banco `DB_NAME` se ele não existir. O nome é validado com `^[A-Za-z0-9_]+$` e usado
   com `QUOTENAME`.
3. Cria a tabela de controle `dbo.SchemaMigrations`.
4. Aplica, em ordem, os arquivos que ainda não estão registrados, cada um numa transação.
5. Se alguma migration falhar, o processo termina com código 1 e o compose reinicia o
   container (`restart: on-failure`).

**Rationale**:
- A imagem do SQL Server não tem o `docker-entrypoint-initdb.d`, ao contrário das imagens de
  Postgres e MySQL.
- Com as migrations no backend, a imagem do banco continua a oficial, sem modificação.
- O compose mantém os 3 serviços pedidos, e o backend já espera o `service_healthy` do banco.
- O mesmo mecanismo funciona com o backend rodando sozinho (README) ou fora do Docker.
- Os scripts continuam em SQL puro e revisável, como pedido.

**Alternatives considered**:
- Entrypoint customizado no container `db` (subir o `sqlservr` em segundo plano e rodar o
  `sqlcmd`): exige uma imagem derivada e é frágil com sinais e reinícios.
- Um serviço `db-init` com `sqlcmd` (`service_completed_successfully`): acrescenta um 4º
  container, e o pedido era de 3.

---

## R7. Container do SQL Server

**Decision**:
- Imagem `mcr.microsoft.com/mssql/server:2025-latest` (SQL Server 17.0, Ubuntu 24.04), com
  `platform: linux/amd64`, `ACCEPT_EULA=Y`, `MSSQL_PID=Developer` e `MSSQL_SA_PASSWORD` vindo do
  `.env`.
- Volume nomeado `mssql-data` em `/var/opt/mssql` e porta `1433:1433`.
- Healthcheck: `sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "SELECT 1" -b`, com
  `interval: 10s`, `timeout: 5s`, `retries: 12` e `start_period: 30s`.

**Rationale e riscos**:
- O manifesto da tag `2025-latest` é **só amd64**. Em hosts ARM (Apple Silicon) é preciso ativar
  a emulação x86 (Rosetta) no Docker Desktop. Isso vai no README, como pré-requisito.
- O caminho do `sqlcmd` nas imagens 2022+ é `/opt/mssql-tools18/bin/sqlcmd` (o `-C` aceita o
  certificado autoassinado). O histórico da imagem 2025 não mostra se ele continua incluído.
  Por isso, o healthcheck tenta primeiro `/opt/mssql-tools18` e depois `/opt/mssql-tools`, e
  isso **precisa ser confirmado no primeiro `docker compose up`** (ver
  [quickstart.md](./quickstart.md), passo 2).
- `MSSQL_SA_PASSWORD` precisa atender à política do SQL Server (8+ caracteres e 3 dos 4 tipos:
  maiúscula, minúscula, dígito, símbolo). O valor padrão do `.env.example` atende. Se a senha
  não atender, o container termina e o healthcheck nunca passa, e isso vai no troubleshooting
  do README.

**Alternatives considered**: a tag `2025-CU9-ubuntu-24.04` (fixa) é mais reprodutível, mas o
pedido foi `2025-latest`. A tag fixa fica registrada como melhoria.

---

## R8. Unicidade do e-mail sem diferenciar maiúsculas

**Decision**: a coluna `Email` é `NVARCHAR(250) COLLATE Latin1_General_100_CI_AS`, com a
constraint `UQ_Candidates_Email`. O valor é gravado como digitado, sem os espaços das bordas.

**Rationale**: a collation *case-insensitive* faz o banco tratar `Maria@Email.com` e
`maria@email.com` como iguais, inclusive quando dois cadastros são salvos ao mesmo tempo (caso
de borda da spec): só um `INSERT` passa. O service não faz uma consulta prévia de existência,
porque ela teria condição de corrida e não é necessária.

**Alternatives considered**: gravar o e-mail em minúsculas e comparar com `LOWER()`. Funciona,
mas muda o que o usuário digitou e depende de disciplina no código. A constraint no banco é
mais robusta.

---

## R9. Mesmas regras de validação no frontend e no backend

**Decision**: a tabela de regras do [data-model.md](./data-model.md) é a fonte única de
verdade. Ela é implementada duas vezes: `candidateInputSchema` (zod) no backend e validadores
do Angular Reactive Forms no frontend. As duas implementações são testadas com os **mesmos
casos**, listados no data-model.

**Rationale**: backend e frontend são projetos pnpm independentes, cada um com seu contexto de
build Docker (R11). Um pacote compartilhado exigiria um workspace pnpm na raiz, e os builds de
cada imagem teriam de receber o monorepo inteiro. Duplicar ~5 regras simples, com casos de teste
espelhados, custa menos.

**Alternatives considered**: workspace pnpm com `packages/shared`, que fica como melhoria
futura se as regras crescerem.

---

## R10. Frontend: Angular 22 + Taiga UI 5.26.0

**Decision**:
- Angular 22.2.0 com componentes standalone, zoneless (padrão das versões atuais), Reactive
  Forms tipados e sinais (`signal`, `computed`) para o estado.
- Taiga UI 5.26.0 (`@taiga-ui/core`, `kit`, `cdk`, `icons`, `i18n`), instalado com
  `ng add taiga-ui`. A compatibilidade foi conferida: o peer `@angular/core` é `>=19.0.0`, e o
  Taiga exige `@angular/cdk` 22 e `@maskito/*` ^5.5 como peers.
- Mapeamento dos componentes:

| Necessidade                         | Componente                                                   |
|-------------------------------------|--------------------------------------------------------------|
| Campos de texto e contador          | `tuiTextfield` + `tuiInput`, `tuiTextarea` (com limite)      |
| Máscara de telefone                 | Maskito (`@maskito/angular`), máscara `(00) 00000-0000`      |
| Upload do PDF                       | `tui-input-files` (`accept="application/pdf"`, 5 MB)         |
| Estado "processando"                | `tui-loader`                                                 |
| Campos preenchidos pelo PDF         | `tuiBadge` / hint no campo                                   |
| Confirmação e erros gerais          | `TuiAlertService` (notificações)                             |
| Listagem                            | `tuiTable`                                                   |
| Lista vazia / não encontrado        | `tui-block-status`                                           |

- Locale `pt-BR` (`registerLocaleData(localePt)`, `LOCALE_ID`) para datas, e idioma português
  do `@taiga-ui/i18n` nas mensagens internas dos componentes.
- Estado: `CandidatesStore` (sinais) para a listagem e os detalhes, e um estado local de
  extração no componente de formulário (ver o diagrama de estados no data-model).

**Rationale**: as versões foram pedidas. Sinais e serviços cumprem o "estado reativo" do
Princípio V. O Reactive Forms é a API de formulários estável, enquanto os Signal Forms ainda
estão evoluindo.

**Alternatives considered**: Angular Material, descartado porque a Taiga UI foi pedida; NgRx,
excessivo para uma entidade.

---

## R11. Comunicação entre frontend e backend

**Decision**: o Nginx do container `frontend` serve o SPA e faz **proxy reverso de `/api/`
para `http://backend:3000`**. Configuração:
- `try_files $uri $uri/ /index.html` para as rotas do SPA.
- `client_max_body_size 6m`.
- `proxy_read_timeout 30s`.

Em desenvolvimento (`ng serve`), o `proxy.conf.json` faz o mesmo papel. O frontend sempre chama
URLs relativas (`/api/...`).

**Rationale**:
- Não há CORS a configurar, nem URL de API "assada" no build do Angular. A mesma imagem funciona
  em qualquer host.
- O limite padrão do Nginx é **1 MB**. Sem aumentá-lo, um PDF válido de 2 MB receberia do Nginx
  um 413 em HTML antes de chegar ao backend. Com `6m` (5 MB mais a folga do multipart), o
  backend aplica o limite exato de 5.242.880 bytes e responde em JSON com a mensagem amigável.
- Um arquivo acima de 6 MB que passe pela validação do navegador recebe um 413 do Nginx. O
  frontend trata qualquer 413 como `FILE_TOO_LARGE`.

**Alternatives considered**: o navegador chamar `localhost:3000` direto, o que exige CORS e uma
URL de API por ambiente.

---

## R12. Testes

**Decision**:
- **Backend**: Vitest 5.0.2.
  - Testes unitários dos services (`CandidateService`, `ResumeExtractionService`), do
    `ResumeFieldParser` e do `candidateInputSchema`, com repositório e extrator falsos.
  - Testes HTTP com `supertest` 7.3 contra o `app` montado com dependências falsas, sem banco.
    Eles verificam os status e o formato de erro do [contrato](./contracts/openapi.yaml).
- **Frontend**: `ng test` com o builder `@angular/build:unit-test` (Vitest 5 + jsdom 30). Cada
  componente tem seu `*.spec.ts`, e também são testados o `CandidatesStore` e os validadores.
- **Fixtures**: os PDFs de `samples/` são usados nos testes do `UnpdfTextExtractor`, validando
  o SC-002 automaticamente.

**Rationale**: é o mesmo runner nos dois lados, e o Vitest é o runner padrão das versões atuais
do Angular. Os testes HTTP com fakes cobrem o contrato sem precisar do SQL Server.

**Alternatives considered**:
- Jest, que exigiria configurar ESM e TypeScript.
- Testes de integração com um SQL Server real (Testcontainers), pesados para o desafio. A
  validação com o banco real é feita pelo [quickstart](./quickstart.md).

---

## R13. Versão do TypeScript

**Decision**: TypeScript **6.0.3** no backend e no frontend, com `strict: true`,
`noUncheckedIndexedAccess`, `noImplicitOverride` e `noImplicitReturns`. O backend usa
`module`/`moduleResolution: NodeNext` (ESM) e compila com `tsc` para `dist/`.

**Rationale**:
- O `@angular/compiler-cli` 22.2.0 exige `typescript >=6.0 <6.1`.
- Usar a mesma versão nos dois lados evita diferenças de checagem.
- O backend roda o JavaScript compilado, em vez do type stripping nativo do Node, para que o
  `pnpm build` seja o gate de tipagem da constituição.

**Alternatives considered**: TypeScript 7.0 (o compilador nativo, latest), incompatível com o
Angular 22. O backend poderia usá-lo sozinho, mas isso criaria duas versões de compilador no
repositório.

---

## R14. Release e versionamento

**Decision**:
- Um `package.json` na **raiz** (`"private": true`) é a única fonte da versão da aplicação.
  Ele contém as ferramentas de release e a chave `"release"`. Isso resolve o ponto em aberto
  da constituição v1.1.0.
- Dependências de desenvolvimento pedidas: `semantic-release` 25.0.9,
  `@semantic-release/commit-analyzer` 13.0.1, `release-notes-generator` 14.1.1, `changelog`
  7.0.0, `npm` 13.2.0, `github` 12.0.10 e `git` 11.0.1.
- Dependências acrescentadas:
  - **`conventional-changelog-conventionalcommits` 10.4.0**, obrigatória para o
    `preset: "conventionalcommits"`. Sem ela, o semantic-release falha com "Cannot find module".
  - `@commitlint/cli` e `@commitlint/config-conventional` 21.2.3 e `husky` 9.1.7, para validar
    as mensagens de commit (constituição, Princípio III, DEVERIA).
- Scripts:
  - `"semantic": "semantic-release --branches main"`, como pedido.
  - `"release:dry": "semantic-release --dry-run --no-ci --branches main"`, para ver localmente
    a próxima versão.
  - `"prepare": "husky"`.
- Configuração `"release"`:
  - `branches: ["main"]`.
  - `commit-analyzer` com o preset `conventionalcommits` e as `releaseRules` da constituição:
    `breaking` e `!`/`BREAKING CHANGE` → major, `feat` e `hotfix` → minor, `fix` e `perf` →
    patch.
  - `release-notes-generator` com seções para `feat`, `hotfix`, `fix`, `perf` e `breaking`.
  - `changelog` (`CHANGELOG.md`).
  - `npm` com `npmPublish: false`.
  - `github`.
  - `git`, com os assets `CHANGELOG.md` e `package.json` e a mensagem
    `chore(release): ${nextRelease.version} [skip ci]`.
- O `commitlint.config.mjs` estende o `config-conventional` e acrescenta `hotfix` e `breaking`
  ao `type-enum`.
- Automação: `.github/workflows/release.yml` roda o `pnpm semantic` a cada push no `main`, com
  `fetch-depth: 0` e as permissões `contents`, `issues` e `pull-requests: write`.
  `.github/workflows/ci.yml` roda build e testes do backend e do frontend e o commitlint em PRs
  para o `main` (gates 1 a 3 da constituição).

**Rationale**: cumpre o Princípio III sem exceções. O primeiro release (1.0.0) acontece no
primeiro merge de `dev` → `main` que tiver um `feat` ou `fix`.

**Alternatives considered (decisão do usuário em 2026-09-29)**:
- Os scripts `"release": "standard-version"` e
  `"prerelease": "standard-version --prerelease preview"` foram **descartados**:
  - Conflitam com o Princípio III (versão só pelo semantic-release, no `main`).
  - O `standard-version` não tem release desde 2022.
  - Um teste com o pnpm 11 e o npm mostrou que `prerelease` roda automaticamente como hook
    antes de `release`, gerando duas versões por execução.
- Fork `commit-and-tag-version` em modo prévia: foi oferecido, e o usuário preferiu usar só o
  semantic-release.

**Risco registrado**: se a proteção de branch do `main` exigir PR, o `GITHUB_TOKEN` padrão não
consegue enviar o commit de release. Nesse caso, use um token ou GitHub App com permissão de
bypass (constituição v1.1.0).

---

## R15. Logs

**Decision**: `pino` com saída JSON no stdout (`LOG_LEVEL` configurável). Para cada extração,
registra o resultado: motivo da falha ou campos identificados, número de páginas e duração em
ms. **Nunca registra o conteúdo do PDF, o texto extraído nem os valores dos campos (LGPD).**

**Rationale**: dá dados concretos para a seção 8 do `DESENVOLVIMENTO.md` (limitações da
extração) sem expor dados pessoais. `docker compose logs backend` basta para ler.

**Alternatives considered**: `console.log` sem estrutura, difícil de filtrar; OpenTelemetry,
excessivo para o escopo.

---

## R16. Currículos de exemplo (`samples/`)

**Decision**: PDFs versionados com dados **fictícios**, mais um `samples/README.md` que lista o
resultado esperado de cada arquivo. O manifesto é a referência do SC-002 e dos testes:

| Arquivo                          | Objetivo                                                       |
|----------------------------------|----------------------------------------------------------------|
| `01-layout-simples.pdf`          | Uma coluna, rótulos "E-mail:" e "Tel.:", CPF e CEP como ruído  |
| `02-duas-colunas.pdf`            | Contato na lateral, nome em MAIÚSCULAS, telefone com +55 e fixo |
| `03-sem-telefone.pdf`            | Sem telefone, para o aviso de campo "não identificado"         |
| `04-rotulo-nome.pdf`             | Nome com rótulo "Nome completo:", depois de um título "Currículo" |
| `05-digitalizado-sem-texto.pdf`  | Só imagem: falha de leitura (`no_text`)                        |
| `06-protegido-por-senha.pdf`     | Criptografado: falha de leitura (`encrypted`)                  |
| `07-corrompido.pdf`              | Truncado: falha de leitura (`corrupted`)                       |
| `08-nao-e-pdf.pdf`               | Conteúdo ZIP com extensão .pdf: formato inválido               |

O arquivo **acima de 5 MB não é versionado**, para não inflar o repositório. O quickstart
mostra o comando para gerá-lo.

**Rationale**: cobre os caminhos de sucesso, os campos parciais e todas as mensagens de erro da
spec, e atende o Princípio VI (layouts variados e dados fictícios).

---

## R17. Limites de desempenho da extração

**Decision**: lê no máximo 5 páginas, com timeout de **4.000 ms**
(`PDF_EXTRACTION_TIMEOUT_MS`). Ao estourar o tempo, responde `PDF_UNREADABLE`, motivo
`timeout`.

**Rationale**: o SC-003 exige resposta (campos ou falha) em até 5 s. No spike, os PDFs de
1 página levaram entre 2 e 72 ms, então sobra margem para arquivos grandes. O processamento
fica na thread principal do Node, e mover o pdf.js para `worker_threads` é uma melhoria futura
caso haja uploads simultâneos.
