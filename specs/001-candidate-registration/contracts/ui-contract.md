# UI Contract: Cadastro e Consulta de Candidatos

**Feature**: [spec.md](../spec.md) | **API**: [openapi.yaml](./openapi.yaml) | **Data**: 2026-09-29

Define as rotas, o conteúdo de cada tela e o texto exato das mensagens. Os testes de
componente e o [quickstart](../quickstart.md) conferem os textos deste arquivo.

## Rotas

| Rota                | Tela                  | Conteúdo mínimo                                                                 |
|---------------------|-----------------------|---------------------------------------------------------------------------------|
| `/`                 | -                     | Redireciona para `/candidatos`                                                  |
| `/candidatos`       | Listagem              | Tabela (Nome, E-mail, Área ou cargo de interesse, Cadastrado em), do mais recente ao mais antigo; botão "Novo candidato"; cada linha abre os detalhes (SC-007: 1 clique) |
| `/candidatos/novo`  | Cadastro              | Upload opcional de PDF no topo; os 5 campos; botão "Salvar"                     |
| `/candidatos/:id`   | Detalhes              | Todos os campos e "Cadastrado em" (data e hora); botão "Voltar para a lista"    |
| `**`                | -                     | Redireciona para `/candidatos`                                                  |

**Formatos de exibição**:
- Datas: `dd/MM/yyyy HH:mm`, no fuso do navegador.
- Telefone: `(41) 99999-9999` ou `(41) 3333-4444`.
- Campo opcional vazio: "Não informado".
- Resumo: preserva as quebras de linha.

## Formulário de cadastro

| Rótulo                        | Campo API             | Controle Taiga UI                     | Observação                                  |
|-------------------------------|-----------------------|---------------------------------------|---------------------------------------------|
| Nome completo *               | `fullName`            | `<tui-textfield>` + `tuiInput`        | `maxlength=250`                             |
| E-mail *                      | `email`               | `<tui-textfield>` + `tuiInput` (email) | `maxlength=250`                            |
| Telefone                      | `phone`               | `<tui-textfield>` + `tuiInput` + Maskito | Máscara `(00) 0000-0000` / `(00) 00000-0000` |
| Área ou cargo de interesse    | `areaOfInterest`      | `<tui-textfield>` + `tuiInput`        | `maxlength=250`                             |
| Resumo profissional           | `professionalSummary` | `<tui-textfield>` + `tuiTextarea`     | `maxlength=1000` (barra digitação e colagem), contador `n / 1000`; cresce com o texto de 4 a 40 linhas |
| Currículo em PDF (opcional)   | -                     | `label[tuiInputFiles]` + `<tui-file>` | `accept="application/pdf,.pdf"`, 5 MB       |

Comportamento:
- Os erros aparecem junto ao campo quando ele perde o foco e também ao tentar salvar (FR-008).
- O botão "Salvar" fica desabilitado **só** enquanto um salvamento está em andamento (FR-013).
  O processamento do PDF não o desabilita (FR-021).
- Campos preenchidos pelo PDF recebem a indicação "Preenchido pelo currículo". Ela some quando
  a pessoa edita o campo.
- Depois do sucesso (201), o formulário é limpo e a notificação de sucesso aparece (FR-010).
- Acessibilidade: cada rótulo aponta para o seu campo (`for`/`id`); o erro fica ligado ao campo
  por `aria-errormessage` (a Taiga sobrescreve o `aria-describedby`) junto com `aria-invalid`; o
  status da leitura do PDF usa `aria-live="polite"`.
- Telas estreitas: a página nunca rola na horizontal. Na listagem, só a tabela rola, dentro de
  uma região focável ("Lista de candidatos").

## Mensagens

Todas em pt-BR, sem códigos técnicos (FR-030). O backend devolve os mesmos textos no campo
`message`. O frontend usa os textos abaixo para as validações feitas no navegador e para
erros sem corpo JSON (ex.: um 413 do Nginx).

### Mensagens de validação

| Campo / código                    | Texto                                                                         |
|-----------------------------------|-------------------------------------------------------------------------------|
| `fullName` `REQUIRED`             | Informe o nome completo.                                                      |
| `fullName` `MAX_LENGTH`           | O nome pode ter no máximo 250 caracteres.                                     |
| `email` `REQUIRED`                | Informe o e-mail.                                                             |
| `email` `MAX_LENGTH`              | O e-mail pode ter no máximo 250 caracteres.                                   |
| `email` `INVALID_EMAIL`           | Informe um e-mail válido, como nome@empresa.com.                              |
| `email` `EMAIL_ALREADY_EXISTS`    | Já existe um candidato com este e-mail.                                       |
| `phone` `INVALID_PHONE`           | Informe o telefone com DDD, com 10 ou 11 dígitos, sem o código do país. Ex.: (41) 99999-9999. |
| `areaOfInterest` `MAX_LENGTH`     | A área ou cargo pode ter no máximo 250 caracteres.                            |
| `professionalSummary` `MAX_LENGTH`| O resumo pode ter no máximo 1000 caracteres.                                  |

### Mensagens do currículo em PDF

| Situação                                    | Código / origem                      | Texto                                                                                         |
|---------------------------------------------|--------------------------------------|-----------------------------------------------------------------------------------------------|
| Processando                                 | estado `processing`                  | Lendo o currículo... Você pode continuar preenchendo o formulário.                           |
| Todos os campos identificados               | 200, `notIdentified` vazio           | Dados do currículo preenchidos. Confira as informações antes de salvar.                      |
| Alguns campos não identificados             | 200, `notIdentified` com itens       | Não encontramos {campos} no currículo. Preencha manualmente. (ex.: "o telefone", "o nome e o telefone") |
| Nenhum campo identificado                   | 200, `identified` vazio              | Não encontramos nome, e-mail nem telefone no currículo. Preencha os dados manualmente.       |
| Formato inválido                            | navegador ou 415 `INVALID_FILE_TYPE` | Formato não aceito. Envie o currículo em PDF.                                                |
| Maior que 5 MB                              | navegador ou 413 `FILE_TOO_LARGE`    | O arquivo tem mais de 5 MB. Envie um PDF de até 5 MB.                                        |
| Protegido por senha                         | 422 `reason: encrypted`              | Não foi possível ler o PDF porque ele está protegido por senha. Preencha os dados manualmente. |
| Corrompido                                  | 422 `reason: corrupted`              | Não foi possível ler o PDF. O arquivo pode estar corrompido. Preencha os dados manualmente.  |
| Sem texto (digitalizado)                    | 422 `reason: no_text`                | Não encontramos texto no PDF. Ele pode ser uma imagem digitalizada. Preencha os dados manualmente. |
| Demorou demais                              | 422 `reason: timeout`                | A leitura do PDF demorou mais que o esperado. Preencha os dados manualmente ou tente outro arquivo. |
| Qualquer outra falha na extração            | 500 / rede                           | Não foi possível ler o PDF agora. Preencha os dados manualmente.                             |

### Mensagens de cadastro e consulta

| Situação                               | Texto                                                                              |
|----------------------------------------|------------------------------------------------------------------------------------|
| Cadastro salvo (201)                   | Candidato cadastrado com sucesso!                                                  |
| Campos inválidos no salvamento (400)   | Alguns campos precisam de correção. (e os erros junto a cada campo)                |
| Falha ao salvar (500 / rede)           | Não foi possível salvar agora. Seus dados continuam no formulário; tente novamente. |
| Lista vazia                            | Nenhum candidato cadastrado ainda. (botão "Cadastrar o primeiro candidato")        |
| Falha ao carregar a lista              | Não foi possível carregar os candidatos. Tente novamente. (botão "Tentar de novo") |
| Candidato não encontrado (404)         | Candidato não encontrado. Ele pode não existir ou o link está incorreto. (botão "Voltar para a lista") |
| Falha ao carregar os detalhes          | Não foi possível carregar o candidato. Tente novamente. (botão "Tentar de novo") |
