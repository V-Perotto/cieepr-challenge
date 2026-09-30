# CIEE-PR Challenge: Cadastro e Consulta de Candidatos

Aplicação web de recrutamento para cadastrar candidatos (manualmente ou a partir de um
currículo em PDF) e consultá-los numa listagem com tela de detalhes.

- **Cadastro manual**: formulário com validação dos campos (nome, e-mail, telefone, área de
  interesse e resumo profissional).
- **Cadastro com PDF**: upload opcional de currículo (até 5 MB). O backend extrai o texto e
  sugere **nome, e-mail e telefone**, que a pessoa revisa antes de salvar. Se o PDF falhar, o
  cadastro manual continua disponível.
- **Consulta**: listagem do mais recente para o mais antigo e detalhes completos de cada
  candidato.

A especificação, o plano técnico e as decisões ficam em
[`specs/001-candidate-registration/`](specs/001-candidate-registration/). O registro de como o
trabalho foi feito está em [`DESENVOLVIMENTO.md`](DESENVOLVIMENTO.md).

## Tecnologias e versões

| Camada | Tecnologia |
|--------|------------|
| Frontend | Angular 22.2 (standalone, zoneless, signals) · Taiga UI 5.26.0 · Maskito 5.6 |
| Backend | Node.js 26.10 · TypeScript 6.0.3 · Express 5.2 · zod 4 · multer 2 · pino 10 |
| Extração de PDF | unpdf 1.8.1 (pdf.js) |
| Banco de dados | SQL Server 2025 (`mcr.microsoft.com/mssql/server:2025-latest`) · driver `mssql` 12 |
| Testes | Vitest 5 (backend e frontend) · supertest · jsdom |
| Infraestrutura | Docker + Docker Compose v2 · Nginx 1.30 (alpine) |
| Pacotes | pnpm 11.21.0 |
| Release | semantic-release 25 (Conventional Commits, `CHANGELOG.md` automático) |

## Estrutura

```text
.
├── backend/              # API Node.js (Controller → Service → Repository) + Dockerfile
│   └── db/migrations/    # scripts SQL aplicados automaticamente na inicialização
├── frontend/             # SPA Angular + Dockerfile (build Node → Nginx)
├── samples/              # currículos PDF de exemplo (dados fictícios)
├── specs/                # especificação, plano, contratos e tarefas (Spec Kit)
├── docker-compose.yml    # db + backend + frontend
└── .env.example          # variáveis de ambiente com valores de desenvolvimento
```

## Pré-requisitos

- **Docker** com o plugin **Compose v2** (`docker compose version`).
- Host **x86_64**. A imagem do SQL Server é publicada só para `amd64`: em Macs com Apple
  Silicon, ative *"Use Rosetta for x86_64/amd64 emulation"* no Docker Desktop.
- Portas **1433**, **3000** e **4200** livres.
- Opcional, só para rodar os testes fora do Docker: Node.js 24.15+ (ou 26) e pnpm 11.21.0
  (`npm install -g pnpm@11.21.0`).

## Executar com Docker Compose (aplicação completa)

**Pré-requisitos**: Docker com Compose v2; host x86_64 (ou emulação no ARM); portas 1433,
3000 e 4200 livres (detalhes em [Pré-requisitos](#pré-requisitos)).

```bash
git clone git@github.com:V-Perotto/cieepr-challenge.git
cd cieepr-challenge
cp .env.example .env
docker compose up --build
```

> Com o Compose antigo (v1), o comando equivalente é `docker-compose up --build`.

Na primeira execução, a imagem do SQL Server (~1,5 GB) é baixada. Quando `db` e `backend`
ficarem `healthy` (`docker compose ps`):

| O quê | Endereço |
|-------|----------|
| Aplicação | <http://localhost:4200> |
| API (direto) | <http://localhost:3000/api/health> |
| SQL Server | `localhost,1433` (usuário `sa`, senha do `.env`) |

O banco `recrutamento` e a tabela de candidatos são criados automaticamente pelo backend na
inicialização (`backend/db/migrations/`). Não há nenhum passo manual de SQL.

**Testes** (em containers, sem Node local; os PDFs de `samples/` são montados para os testes
de integração do backend):

```bash
docker build --target test -t cieepr-backend-test ./backend
docker run --rm -v "$PWD/samples:/samples:ro" cieepr-backend-test

docker build --target test -t cieepr-frontend-test ./frontend
docker run --rm cieepr-frontend-test
```

Para encerrar:

```bash
docker compose down        # mantém os dados (volume mssql-data)
docker compose down -v     # apaga também o banco
```

## Executar cada aplicação com Docker

Os comandos abaixo são executados na raiz do repositório, depois do `cp .env.example .env`.

### Backend (API)

**Pré-requisitos**: Docker; host x86_64 (ou emulação no ARM) para o SQL Server; portas 1433 e
3000 livres; `.env` copiado do `.env.example`.

O backend precisa de um SQL Server. Suba um numa rede Docker e depois a API na mesma rede:

```bash
docker network create cieepr-net

docker run -d --name cieepr-db --network cieepr-net --platform linux/amd64 \
  -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD='Dev_Passw0rd!2026' \
  -p 1433:1433 mcr.microsoft.com/mssql/server:2025-latest

docker build -t cieepr-backend ./backend
docker run -d --name cieepr-backend --network cieepr-net --network-alias backend \
  --env-file .env -e DB_HOST=cieepr-db -p 3000:3000 cieepr-backend

curl http://localhost:3000/api/health   # {"status":"ok","database":"up"} após ~20 s
```

A API fica em <http://localhost:3000>, com os endpoints em `/api` (contrato em
[`openapi.yaml`](specs/001-candidate-registration/contracts/openapi.yaml)). As migrations rodam
na inicialização. Se o banco ainda estiver subindo, o backend tenta conectar de novo por até
60 s.

**Testes do backend** (unitários, HTTP e de integração com os PDFs de `samples/`):

```bash
docker build --target test -t cieepr-backend-test ./backend
docker run --rm -v "$PWD/samples:/samples:ro" cieepr-backend-test
```

### Frontend (SPA + Nginx)

**Pré-requisitos**: Docker; porta 4200 livre; a API do roteiro anterior rodando na rede
`cieepr-net`.

O Nginx do frontend encaminha `/api/` para o host **`backend:3000`**. Para rodar a imagem
sozinha, coloque-a na mesma rede de um container acessível como `backend`, como o do exemplo
anterior, que foi criado com `--network-alias backend`:

```bash
docker build -t cieepr-frontend ./frontend
docker run -d --name cieepr-frontend --network cieepr-net -p 4200:80 cieepr-frontend
```

Acesse <http://localhost:4200>.

**Testes do frontend** (componentes, store e validadores, com Vitest + jsdom):

```bash
docker build --target test -t cieepr-frontend-test ./frontend
docker run --rm cieepr-frontend-test
```

Para limpar esse cenário:

```bash
docker rm -f cieepr-frontend cieepr-backend cieepr-db && docker network rm cieepr-net
```

## Testar a importação de currículo

A pasta [`samples/`](samples/) tem currículos PDF **fictícios**, com o resultado esperado de
cada um em [`samples/README.md`](samples/README.md):

1. Abra <http://localhost:4200/candidatos/novo>.
2. Em **Currículo em PDF (opcional)**, escolha `samples/01-layout-simples.pdf` ou
   `samples/02-duas-colunas.pdf`.
3. Nome, e-mail e telefone são preenchidos e marcados com "Preenchido pelo currículo".
   Revise e clique em **Salvar**.
4. Teste as falhas com `05` (sem texto), `06` (com senha), `07` (corrompido) e `08` (não é
   PDF). O formulário continua disponível para preenchimento manual.

Pela API:

```bash
curl -F file=@samples/01-layout-simples.pdf http://localhost:3000/api/resume-extractions
```

O roteiro completo de validação, com todos os cenários de aceite, está em
[`specs/001-candidate-registration/quickstart.md`](specs/001-candidate-registration/quickstart.md).

## Testes automatizados

Em containers, conforme os roteiros acima, ou localmente, com Node.js e pnpm:

```bash
cd backend && pnpm install && pnpm build && pnpm test
cd ../frontend && pnpm install && pnpm build && pnpm test
```

- **Backend**: testes unitários dos services, do parser de currículo e das regras de
  validação; testes HTTP (supertest) de todos os endpoints; testes de integração do extrator
  com os PDFs de `samples/`.
- **Frontend**: testes de cada componente, do store, dos validadores e do tratamento de
  erros da API.

A mesma verificação roda no GitHub Actions ([`ci.yml`](.github/workflows/ci.yml)) a cada push
em `dev` e em Pull Requests para `main`.

## Fluxo de desenvolvimento e release

- O desenvolvimento acontece na branch `dev`. O `main` recebe só Pull Requests `dev` → `main`
  integrados com **merge commit**.
- Os commits seguem **Conventional Commits** e são validados pelo commitlint (hook do husky,
  ativado com `pnpm install` na raiz). Tipos extras: `hotfix` (minor) e `breaking` (major).
- A cada merge no `main`, o [`release.yml`](.github/workflows/release.yml) roda o
  `semantic-release`, que calcula a versão SemVer, atualiza o `CHANGELOG.md` e o
  `package.json` da raiz e cria o release no GitHub (sem publicar no npm).
- **Depois de cada release**, faça o merge do `main` de volta em `dev`. Assim o commit
  `chore(release)` (com o `CHANGELOG.md` e a versão) chega a `dev` e o próximo PR não tem
  conflitos:

  ```bash
  git checkout dev && git pull && git fetch origin && git merge origin/main && git push
  ```

- Para ver localmente a próxima versão, sem gravar nada: `pnpm install && pnpm release:dry`.

## Solução de problemas

| Sintoma | Causa provável / solução |
|---------|--------------------------|
| `db` nunca fica `healthy`; log com *"password does not meet the policy"* | `MSSQL_SA_PASSWORD` fraca. Use 8+ caracteres com 3 de: maiúscula, minúscula, dígito, símbolo. Depois `docker compose down -v`. |
| *"port is already allocated"* | Outra aplicação usa 1433, 3000 ou 4200. Pare-a ou altere o mapeamento de portas no `docker-compose.yml`. |
| `db` reinicia em loop num Mac M1/M2/M3 | Ative a emulação x86 (Rosetta) no Docker Desktop. A imagem do SQL Server é só `amd64`. |
| `backend` reinicia no começo | Normal enquanto o SQL Server termina de subir (`restart: on-failure`). Acompanhe em `docker compose logs -f backend`. |
| Healthcheck do `db` falha com *"sqlcmd: not found"* | O caminho usado é `/opt/mssql-tools18/bin/sqlcmd` (confirmado na imagem 2025). Se uma imagem futura mudar isso, ajuste o `healthcheck` do `db`. |
