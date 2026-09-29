# CIEE-PR Challenge Constitution

## Core Principles

Palavras normativas: **DEVE** / **NÃO DEVE** = obrigatório (MUST / MUST NOT);
**DEVERIA** = recomendado, e qualquer desvio precisa de justificativa registrada (SHOULD).

### I. Architecture & Stack

A stack é fixa. Trocar qualquer componente exige emenda a esta constituição.

- **Frontend**: Angular, em TypeScript.
- **Backend**: Node.js, em TypeScript.
- **Banco de dados**: SQL Server.
- **Infraestrutura**: frontend e backend DEVEM ter cada um o seu `Dockerfile`. Um
  `docker-compose.yml` na raiz do repositório DEVE orquestrar frontend, backend e SQL Server
  para execução local.
- O ambiente completo DEVE subir com `docker compose up` depois de copiar `.env.example` para
  `.env`. A máquina host NÃO DEVE precisar de nenhuma instalação além do Docker (com o plugin
  Compose).

**Rationale**: a stack é definida pelo desafio. Com Docker, qualquer avaliador executa a
solução do mesmo jeito, seja qual for o ambiente local.

### II. Package Manager (pnpm)

- pnpm é o único gerenciador de pacotes permitido no backend, no frontend e em qualquer
  `package.json` da raiz.
- `pnpm-lock.yaml` DEVE ser versionado. `package-lock.json` e `yarn.lock` NÃO DEVEM existir no
  repositório.
- Dockerfiles e pipelines DEVEM instalar dependências com pnpm (ex.: via Corepack) usando
  `--frozen-lockfile`.
- A versão do pnpm DEVERIA ficar fixada no campo `packageManager` de cada `package.json`.

**Rationale**: um único gerenciador e um único lockfile tornam a instalação determinística na
máquina local, no build Docker e no pipeline de release.

### III. Versioning & Release Automation

- O versionamento SemVer DEVE ser automatizado com `semantic-release`, executado somente no
  branch `main`.
- Os commits DEVEM seguir Conventional Commits. As regras de release são customizadas
  (`releaseRules` do commit-analyzer):

  | Tipo de commit                                                      | Release     |
  |---------------------------------------------------------------------|-------------|
  | `breaking`, ou qualquer commit com `!` / rodapé `BREAKING CHANGE:`  | major       |
  | `feat`                                                              | minor       |
  | `hotfix`                                                            | minor       |
  | `fix`                                                               | patch       |
  | `perf`                                                              | patch       |
  | demais (`docs`, `chore`, `refactor`, `test`, `style`, `ci`, `build`)| sem release |

- Cada release DEVE gerar ou atualizar o `CHANGELOG.md` e o campo `version` do `package.json`,
  e commitar os dois de volta no `main`.
- A publicação no npm DEVE ficar desabilitada (`npmPublish: false`).
- Commits fora do padrão NÃO DEVEM chegar ao `main`. A validação DEVERIA ser automática (ex.:
  commitlint configurado para aceitar os tipos customizados `hotfix` e `breaking`).

**Rationale**: a versão sai dos commits de forma determinística, sem bump manual, e o histórico
vira um changelog legível.

### IV. Environment & Security

- Valores sensíveis (senhas, connection strings, chaves, tokens) NÃO DEVEM ser versionados nem
  ficar hardcoded no código, nos Dockerfiles ou no `docker-compose.yml`. Esses valores DEVEM
  vir de variáveis de ambiente (o compose usa interpolação `${VAR}`).
- `.env` e suas variantes locais (ex.: `.env.local`) DEVEM estar no `.gitignore`.
- A raiz DEVE ter um `.env.example` que lista TODAS as variáveis usadas pelo backend, pelo
  frontend e pelo compose, com valores padrão que funcionam em desenvolvimento/Docker. Cada
  variável DEVERIA ter um comentário curto explicando para que serve.
- Os valores do `.env.example` DEVEM servir só para desenvolvimento local (ex.: uma senha SA de
  exemplo para o SQL Server) e nunca podem ser credenciais reais.
- Criar uma variável nova sem adicioná-la ao `.env.example` viola este princípio.

**Rationale**: evita vazamento de segredos e deixa qualquer pessoa subir o ambiente só copiando
o `.env.example`.

### V. Code Quality & Standards

**Backend: Clean Architecture em camadas Controller → Service → Repository**, com as
dependências sempre apontando para dentro:

- **Controllers** cuidam apenas de HTTP: entrada, validação, mapeamento de resposta e de erros.
  NÃO DEVEM ter regra de negócio nem acessar o banco.
- **Services** contêm as regras de negócio. NÃO DEVEM depender de objetos HTTP (req/res) nem de
  SQL, e dependem de abstrações (interfaces) dos repositórios.
- **Repositories** são o único ponto de acesso ao SQL Server.

**Frontend: componentização e estado reativo**:

- A UI DEVE ser dividida em componentes pequenos, cada um com uma responsabilidade. O acesso à
  API fica em services, nunca dentro dos componentes.
- O estado DEVE ser gerenciado de forma reativa (Signals e/ou Observables do RxJS) e exposto por
  services/stores. Componentes NÃO DEVEM compartilhar estado mutável de outra forma.

**TypeScript totalmente tipado**:

- Todo `tsconfig` do backend e do frontend DEVE usar `strict: true`.
- `any`, explícito ou implícito, é proibido. Use tipos específicos, ou `unknown` com narrowing.
  Exceções inevitáveis (ex.: tipagem ausente em biblioteca de terceiros) DEVEM ter a
  justificativa num comentário no próprio código.
- Os payloads da API (DTOs) DEVEM ter tipos explícitos no backend e no frontend.

**Rationale**: separar as camadas permite testar os services isoladamente (Princípio VI), e a
tipagem estrita pega erros em tempo de compilação.

### VI. Testing & Sample Assets

- Todo service de negócio do backend DEVE ter testes unitários, com os repositórios e as
  dependências externas mockados por meio das suas interfaces.
- Cada componente Angular DEVE ter testes unitários (`*.spec.ts`) cobrindo a renderização e as
  interações principais.
- Os testes DEVEM rodar com `pnpm test` em cada aplicação.
- O repositório DEVE conter currículos em PDF de exemplo, num diretório dedicado e indicado no
  `README.md`, para testar a funcionalidade de importação.
- Esses PDFs DEVEM conter apenas dados fictícios, sem nenhum dado pessoal real (LGPD). Eles
  DEVERIAM cobrir layouts variados (ex.: uma coluna, duas colunas, seções em ordens diferentes)
  para mostrar até onde a extração funciona.

**Rationale**: os testes unitários protegem as regras de negócio, e os PDFs de exemplo deixam
qualquer avaliador validar a importação sem precisar de currículos próprios.

### VII. Documentation & Traceability

- `DESENVOLVIMENTO.md`, na raiz, é um entregável obrigatório de rastreabilidade e DEVE conter,
  nesta ordem, uma seção para cada item:
  1. Organização e execução do trabalho.
  2. Principais decisões técnicas e justificativas.
  3. Ferramentas de IA e modelos utilizados (ex.: Spec Kit, Claude, Gemini para pesquisas).
  4. Exemplos práticos de onde a IA ajudou (prompts e como as respostas foram usadas).
  5. Ajustes, correções ou descartes feitos sobre o código gerado por IA.
  6. Processo de validação e testes da solução.
  7. Tempo estimado e tempo real dedicado ao desafio.
  8. Dificuldades, limitações da extração de PDF e melhorias futuras.
- As seções 4 e 5 DEVERIAM ser preenchidas enquanto o trabalho acontece, e não reconstruídas de
  memória no final.
- O `README.md` DEVE trazer o passo a passo de execução via Docker para o backend, para o
  frontend (build e run de cada imagem) e para a stack completa com `docker compose`. Cada
  roteiro DEVE incluir os pré-requisitos, a cópia do `.env.example`, os comandos, as portas/URLs
  de acesso e como rodar os testes.

**Rationale**: o desafio avalia também o processo. A rastreabilidade do uso de IA e instruções
de execução reproduzíveis fazem parte da entrega.

## Technical Constraints & Repository Layout

- A raiz do repositório DEVE conter:
  - `backend/`: API Node.js/TypeScript e o seu `Dockerfile`.
  - `frontend/`: aplicação Angular e o seu `Dockerfile`.
  - `docker-compose.yml`, `.env.example`, `README.md`, `DESENVOLVIMENTO.md`, `CHANGELOG.md`
    (gerado pelo release) e a configuração do `semantic-release`.
  - O diretório de currículos PDF de exemplo (Princípio VI).
- O schema do banco DEVE ser criado ou migrado automaticamente quando o ambiente sobe
  (migrations ou script de inicialização), sem nenhum passo manual de SQL.
- Dependências que representem decisão técnica relevante (ex.: biblioteca de extração de PDF,
  driver ou ORM do SQL Server) DEVERIAM ser justificadas na seção 2 do `DESENVOLVIMENTO.md`.

## Development Workflow & Quality Gates

- As funcionalidades seguem o fluxo do Spec Kit: `/speckit-specify` → `/speckit-plan` (com o
  Constitution Check) → `/speckit-tasks` → `/speckit-implement`.
- Todo código gerado por IA DEVE ser revisado pelo autor antes do commit. Ajustes, correções ou
  descartes relevantes DEVEM ser registrados na seção 5 do `DESENVOLVIMENTO.md`.
- Antes de qualquer integração no `main`, todos os gates abaixo DEVEM ser atendidos:
  1. Os commits seguem Conventional Commits com os tipos do Princípio III.
  2. O build TypeScript em modo `strict` (`pnpm build`) passa sem erros no backend e no
     frontend.
  3. `pnpm test` passa no backend e no frontend.
  4. `docker compose up` sobe a stack completa a partir de um `.env` copiado do `.env.example`.
  5. Nenhum segredo real foi versionado, e o `.env.example` inclui todas as variáveis novas.
  6. `README.md` e `DESENVOLVIMENTO.md` estão atualizados com as mudanças.

## Governance

- Esta constituição prevalece sobre qualquer outra prática, template ou instrução de ferramenta
  de IA usada no projeto. Em caso de conflito, vale a constituição, a menos que ela seja emendada
  explicitamente.
- **Emendas**: são feitas com `/speckit-constitution`, que atualiza este arquivo, a versão e a
  data de emenda. O commit usa o tipo `docs:` (ex.: `docs: amend constitution to vX.Y.Z`), e
  emendas relevantes DEVEM ser registradas na seção 2 do `DESENVOLVIMENTO.md`.
- **Versionamento desta constituição** (independente da versão da aplicação):
  - MAJOR: remoção ou redefinição incompatível de um princípio.
  - MINOR: novo princípio ou seção, ou expansão material de uma orientação.
  - PATCH: esclarecimentos e ajustes de redação sem mudar o significado.
- **Conformidade**: todo `plan.md` DEVE passar pelo Constitution Check antes do design e de novo
  depois dele. Uma violação só é aceita se estiver registrada, com justificativa, na tabela
  Complexity Tracking do plano. No `/speckit-analyze`, conflitos com esta constituição são
  sempre CRITICAL.

**Version**: 1.0.0 | **Ratified**: 2026-09-29 | **Last Amended**: 2026-09-29
