# Quickstart: validação de ponta a ponta

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data**: 2026-09-29

Roteiro para provar que a feature funciona com a stack real, em Docker. Cada passo indica os
requisitos (FR) e critérios de sucesso (SC) que ele cobre. Os contratos de referência são
[openapi.yaml](./contracts/openapi.yaml) e [ui-contract.md](./contracts/ui-contract.md).

## 0. Pré-requisitos

- Docker com o plugin Compose v2 (`docker compose version`).
- Host **x86_64**. Em ARM (Apple Silicon), ative a emulação x86/Rosetta no Docker Desktop,
  porque a imagem do SQL Server é só amd64 ([research R7](./research.md)).
- As portas 1433, 3000 e 4200 livres.
- Opcional, para rodar os testes fora do Docker: Node 24.15+ ou 26 e pnpm 11.21.0.

## 1. Subir o ambiente (Princípio I, gate 4)

```bash
git clone git@github.com:V-Perotto/cieepr-challenge.git && cd cieepr-challenge
cp .env.example .env
docker compose up --build -d
docker compose ps
```

**Esperado**: `db` e `backend` como `healthy`, `frontend` como `running`. O primeiro build
baixa cerca de 2 GB, por causa da imagem do SQL Server.

## 2. Conferir banco, migrations e healthcheck

```bash
docker compose logs backend | grep -i migration
curl -s http://localhost:3000/api/health
docker compose exec db ls /opt/mssql-tools18/bin/sqlcmd
```

**Esperado**:
- O log mostra a criação do banco e a aplicação de `0001_create_candidates.sql` na primeira
  subida, e "nenhuma migration pendente" nas seguintes.
- O health responde `{"status":"ok","database":"up"}`.
- O `sqlcmd` existe no caminho usado pelo healthcheck. **Se não existir**, ajuste o healthcheck
  conforme o [research R7](./research.md) antes de continuar.

## 3. Cadastro manual (História 1, FR-001 a FR-013, SC-001, SC-006)

Na interface (`http://localhost:4200/candidatos/novo`):

| Ação                                                                        | Esperado                                                                  |
|-----------------------------------------------------------------------------|---------------------------------------------------------------------------|
| Salvar vazio                                                                | Erros em Nome e E-mail; nada é gravado                                    |
| Nome `Maria Souza`, e-mail `maria@`                                         | Erro "Informe um e-mail válido..."                                        |
| Telefone `99999-9999`                                                       | Erro de telefone (DDD + 10/11 dígitos)                                    |
| Dados válidos, telefone `(41) 99999-9999`                                   | "Candidato cadastrado com sucesso!", formulário limpo                     |
| Repetir com e-mail `MARIA@example.com` (depois de salvar `maria@example.com`) | "Já existe um candidato com este e-mail."; dados continuam no formulário |
| Clicar duas vezes em Salvar rapidamente                                     | Um único cadastro na listagem                                             |

Validação fora do formulário (SC-006, FR-009), com os exemplos do contrato `createCandidate`:

```bash
curl -s -X POST http://localhost:3000/api/candidates -H 'Content-Type: application/json' \
  -d '{"fullName":"   ","email":"x"}'
curl -s -X POST http://localhost:3000/api/candidates -H 'Content-Type: application/json' \
  -d '{"fullName":"Teste","email":"teste@example.com","phone":"+55 41 99999-9999"}'
```

**Esperado**: HTTP 400 com `VALIDATION_ERROR` e erros por campo (`REQUIRED`, `INVALID_EMAIL`,
`INVALID_PHONE`).

## 4. Consulta (História 2, FR-025 a FR-029, SC-007, SC-008)

| Ação                                                          | Esperado                                                        |
|---------------------------------------------------------------|-----------------------------------------------------------------|
| Abrir `/candidatos` com o banco vazio (antes do passo 3, ou depois de `docker compose down -v`) | Mensagem de lista vazia com o atalho para cadastrar |
| Abrir `/candidatos` depois do passo 3                         | Candidatos do mais recente ao mais antigo                       |
| Clicar em uma linha                                           | Detalhes com todos os campos, acentos e quebras de linha intactos |
| Abrir `/candidatos/999999`                                    | "Candidato não encontrado..." e o botão de voltar               |

## 5. Cadastro com PDF (História 3, FR-014 a FR-024, SC-002 a SC-005)

Use os arquivos de `samples/`. O resultado esperado de cada um está em `samples/README.md`
([research R16](./research.md)).

| Arquivo                          | Esperado                                                                        |
|----------------------------------|---------------------------------------------------------------------------------|
| `01-layout-simples.pdf`          | Nome, e-mail e telefone preenchidos; CPF e CEP ignorados                        |
| `02-duas-colunas.pdf`            | Nome em título (`João Pereira`), telefone fixo sem +55                          |
| `03-sem-telefone.pdf`            | Aviso "Não encontramos o telefone..."; o campo continua editável                |
| `04-rotulo-nome.pdf`             | Nome obtido do rótulo, e não do título "Currículo"                              |
| `05-digitalizado-sem-texto.pdf`  | Mensagem de PDF sem texto; formulário intacto                                   |
| `06-protegido-por-senha.pdf`     | Mensagem de PDF protegido por senha                                             |
| `07-corrompido.pdf`              | Mensagem de PDF corrompido                                                      |
| `08-nao-e-pdf.pdf`               | "Formato não aceito. Envie o currículo em PDF."                                 |
| Arquivo de 6 MB (comando abaixo) | "O arquivo tem mais de 5 MB..."                                                 |

```bash
# Arquivo grande, não versionado: começa com %PDF- e passa de 5 MB
{ printf '%%PDF-1.7\n'; head -c 6000000 /dev/zero; } > /tmp/grande.pdf
```

Verificações extras:
- **FR-017**: digite um nome e depois anexe `01-layout-simples.pdf`. O nome digitado continua.
- **FR-021, SC-005**: depois de cada falha acima, complete o formulário à mão e salve sem
  recarregar a página.
- **SC-003**: o resultado aparece em até 5 s (o log do backend registra `durationMs`).
- **FR-024**: `docker compose exec backend find / -xdev -name '*.pdf' -mmin -10` não encontra
  nenhum arquivo depois dos uploads, porque o upload fica só em memória.

Pela API:

```bash
curl -s -F file=@samples/01-layout-simples.pdf http://localhost:3000/api/resume-extractions
curl -s -o /dev/null -w '%{http_code}\n' -F file=@samples/08-nao-e-pdf.pdf http://localhost:3000/api/resume-extractions
curl -s -o /dev/null -w '%{http_code}\n' -F file=@/tmp/grande.pdf http://localhost:4200/api/resume-extractions
```

**Esperado**: 200 com `fields`, `identified` e `notIdentified`; depois 415; depois 413, mesmo
passando pelo Nginx ([research R11](./research.md)).

## 6. Testes automatizados (Princípio VI, gates 2 e 3)

```bash
cd backend  && pnpm install && pnpm build && pnpm test
cd ../frontend && pnpm install && pnpm build && pnpm test
```

**Esperado**: build sem erros em modo `strict` e todos os testes passando, incluindo os casos
compartilhados de validação do [data-model](./data-model.md#2-regras-de-validação-fonte-única-para-frontend-e-backend)
e os testes do extrator com os PDFs de `samples/` (SC-002).

## 7. Release (Princípio III)

```bash
pnpm install          # na raiz: ferramentas de release e hooks do husky
echo "feat: teste" | pnpm exec commitlint   # aceito
echo "hotfix: teste" | pnpm exec commitlint # aceito (tipo customizado)
echo "update stuff" | pnpm exec commitlint  # recusado
pnpm release:dry      # mostra a próxima versão, sem gravar nada
```

**Esperado**: o commitlint aceita `hotfix` e `breaking` e recusa mensagens fora do padrão. O
dry-run analisa os commits sem criar tag, commit nem CHANGELOG.

## 8. Encerrar

```bash
docker compose down        # mantém os dados (volume mssql-data)
docker compose down -v     # apaga também o banco
```
