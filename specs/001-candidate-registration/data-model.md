# Data Model: Cadastro e Consulta de Candidatos

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data**: 2026-09-29

## 1. Candidato (persistido)

Tabela `dbo.Candidates` no banco `DB_NAME`, criada pela migration
`backend/db/migrations/0001_create_candidates.sql` (ver [research R6](./research.md)).

| Campo (API)           | Coluna                | Tipo SQL                                         | Nulo | Regras / constraints                                                                 |
|-----------------------|-----------------------|--------------------------------------------------|------|--------------------------------------------------------------------------------------|
| `id`                  | `Id`                  | `INT IDENTITY(1,1)`                              | não  | `PK_Candidates`                                                                      |
| `fullName`            | `FullName`            | `NVARCHAR(250)`                                  | não  | `CK_Candidates_FullName_NotBlank`: `LEN(LTRIM(RTRIM(FullName))) > 0`                 |
| `email`               | `Email`               | `NVARCHAR(250) COLLATE Latin1_General_100_CI_AS` | não  | `UQ_Candidates_Email` (único, sem diferenciar maiúsculas; [R8](./research.md))       |
| `phone`               | `Phone`               | `VARCHAR(11)`                                    | sim  | `CK_Candidates_Phone_Digits`: `Phone IS NULL OR (LEN(Phone) IN (10,11) AND Phone NOT LIKE '%[^0-9]%')` |
| `areaOfInterest`      | `AreaOfInterest`      | `NVARCHAR(250)`                                  | sim  | -                                                                                    |
| `professionalSummary` | `ProfessionalSummary` | `NVARCHAR(1000)`                                 | sim  | Quebras de linha preservadas                                                         |
| `createdAt`           | `CreatedAt`           | `DATETIME2(3)`                                   | não  | `DEFAULT SYSUTCDATETIME()`; gravado em UTC e exibido no fuso do navegador            |

**Índices**:
- `IX_Candidates_CreatedAt`: `(CreatedAt DESC) INCLUDE (FullName, Email, AreaOfInterest)`,
  que atende a listagem (FR-025) sem ler a tabela inteira.

**Normalização antes de gravar** (feita no service, testada unitariamente):
- Todos os campos de texto: remover os espaços das bordas (FR-007).
- Opcionais vazios depois do trim: gravar como `NULL` (e não como `''`).
- `phone`: remover parênteses, espaços e hífen e guardar só os dígitos (FR-004).
- `email`: gravar como digitado, sem os espaços das bordas. A comparação sem diferenciar
  maiúsculas fica com a collation.

**Ciclo de vida**: o candidato é criado e depois só lido. Esta versão não tem edição nem
exclusão (Assumptions da spec), então não há transições de estado.

**Tabela de controle**: `dbo.SchemaMigrations` (`Name NVARCHAR(255) PK`, `AppliedAt DATETIME2(3)
DEFAULT SYSUTCDATETIME()`) registra as migrations já aplicadas.

## 2. Regras de validação (fonte única para frontend e backend)

As duas implementações, Angular validators e o `candidateInputSchema` (zod), DEVEM seguir esta
tabela e ser testadas com os mesmos casos ([research R9](./research.md)). O texto das
mensagens está em [contracts/ui-contract.md](./contracts/ui-contract.md#mensagens-de-validação).

| Campo                 | Obrigatório | Regra (aplicada depois do trim)                                         | Código de erro          |
|-----------------------|-------------|-------------------------------------------------------------------------|-------------------------|
| `fullName`            | sim         | 1 a 250 caracteres                                                      | `REQUIRED`, `MAX_LENGTH` |
| `email`               | sim         | até 250 caracteres; formato `local@domínio.tld`                         | `REQUIRED`, `MAX_LENGTH`, `INVALID_EMAIL` |
| `phone`               | não         | aceita dígitos, `(`, `)`, espaço e `-`; depois de normalizar, 10 ou 11 dígitos | `INVALID_PHONE`   |
| `areaOfInterest`      | não         | até 250 caracteres                                                      | `MAX_LENGTH`            |
| `professionalSummary` | não         | até 1000 caracteres                                                     | `MAX_LENGTH`            |

**Casos de teste compartilhados** (os dois lados DEVEM cobrir todos):

| Caso                                      | Entrada                                  | Resultado esperado                |
|-------------------------------------------|------------------------------------------|-----------------------------------|
| Nome só com espaços                       | `fullName: "   "`                        | `REQUIRED`                        |
| Nome com 250 / 251 caracteres             | `"a" × 250` / `"a" × 251`                | válido / `MAX_LENGTH`             |
| E-mail malformado                         | `maria@`, `maria.com`, `@x.com`          | `INVALID_EMAIL`                   |
| E-mail com espaços nas bordas             | `"  maria@x.com "`                       | válido, gravado `maria@x.com`     |
| Telefone celular formatado                | `(41) 99999-9999`                        | válido, gravado `41999999999`     |
| Telefone fixo formatado                   | `(41) 3333-4444`                         | válido, gravado `4133334444`      |
| Telefone sem DDD                          | `99999-9999`                             | `INVALID_PHONE`                   |
| Telefone com código do país               | `+55 41 99999-9999`                      | `INVALID_PHONE`                   |
| Telefone com letras                       | `41abc999999`                            | `INVALID_PHONE`                   |
| Telefone vazio                            | `""`                                     | válido, gravado `NULL`            |
| Resumo com 1000 / 1001 caracteres         | `"x" × 1000` / `"x" × 1001`              | válido / `MAX_LENGTH`             |
| Acentos e quebras de linha                | `Conceição`, resumo com `\n`             | preservados na leitura            |

**Regra de negócio fora do schema**: e-mail duplicado → `EMAIL_ALREADY_EXISTS` (HTTP 409),
detectado pela constraint `UQ_Candidates_Email` (FR-012).

## 3. Resultado da extração do currículo (temporário)

Não é persistido: só existe na resposta de `POST /api/resume-extractions`, e o arquivo é
descartado depois do processamento (FR-024). O schema completo está em
[contracts/openapi.yaml](./contracts/openapi.yaml) (`ResumeExtractionResult`).

| Campo            | Tipo                                           | Descrição                                                                   |
|------------------|------------------------------------------------|-----------------------------------------------------------------------------|
| `fields`         | `{ fullName, email, phone }` (`string \| null`) | Valores sugeridos; já validados pelas regras da seção 2 e normalizados      |
| `identified`     | `Array<'fullName' \| 'email' \| 'phone'>`       | Campos encontrados                                                          |
| `notIdentified`  | `Array<'fullName' \| 'email' \| 'phone'>`       | Campos não encontrados, para o aviso de preenchimento manual (FR-018)       |
| `pagesRead`      | `number`                                       | Páginas analisadas (no máximo 5, [R17](./research.md))                      |

Falhas não geram este objeto: elas são respondidas como erro, com
`code: PDF_UNREADABLE` e `reason` igual a `encrypted`, `corrupted`, `no_text` ou `timeout`.

## 4. Estado da extração no formulário (frontend)

O estado é local ao componente de cadastro e implementado com sinais. Ele nunca bloqueia a
edição nem o salvamento dos campos (FR-021, FR-023).

```text
                 anexa arquivo
   ┌────────┐  (passou nas checagens      ┌─────────────┐   200    ┌──────────┐
   │  idle  │ ── de tipo/tamanho) ──────▶ │ processing  │ ───────▶ │ applied  │
   └────────┘                             └─────────────┘          └──────────┘
     ▲   │ arquivo inválido no                 │  │ 413/415/422/erro     │
     │   ▼ navegador                           │  ▼                      │
     │ ┌──────────┐                            │ ┌──────────┐            │
     │ │ rejected │                            │ │  failed  │            │
     │ └──────────┘                            │ └──────────┘            │
     │                                         │ salvar / remover arquivo│
     └────── remover arquivo / novo arquivo ◀──┴─────────────────────────┘
```

- `processing` → `applied`: preenche **só os campos vazios** (FR-017) e marca quais vieram do
  currículo.
- Salvar ou remover o arquivo durante `processing` cancela a requisição, e o resultado tardio é
  ignorado (Edge Cases da spec).
- `rejected` e `failed` mostram a mensagem correspondente
  ([ui-contract](./contracts/ui-contract.md)). O formulário continua como estava.
