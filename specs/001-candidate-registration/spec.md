# Feature Specification: Cadastro e Consulta de Candidatos

**Feature Branch**: `dev` (sem branch de feature dedicada; diretório `specs/001-candidate-registration`)

**Created**: 2026-09-29

**Status**: Implemented

**Input**: Descrição do usuário:

> Criar uma aplicação web de recrutamento e seleção para cadastro e consulta de candidatos
> contendo:
>
> Modos de Cadastro (utilizando o mesmo formulário e regras de validação):
> 1. Cadastro Manual: Preenchimento direto do formulário sem envio de documento.
> 2. Cadastro com PDF: Upload opcional de currículo em PDF (máx. 5 MB). O backend deve processar
>    o PDF, extrair o texto e tentar preencher automaticamente Nome, E-mail e Telefone no
>    formulário. A ausência ou falha no processamento do PDF NÃO pode bloquear o cadastro manual.
>    O usuário deve conseguir corrigir ou complementar as informações antes de salvar.
>
> Campos e Validações do Cadastro:
> - Nome completo: Obrigatório, máximo 250 caracteres.
> - E-mail: Obrigatório, máximo 250 caracteres, validação de formato de e-mail.
> - Telefone: Opcional, máximo 11 caracteres.
> - Área ou cargo de interesse: Opcional, máximo 250 caracteres.
> - Resumo profissional: Opcional, máximo 1000 caracteres.
>
> Funcionalidades de Consulta:
> - Listagem dos candidatos cadastrados com opção de acessar uma tela de detalhes com os dados
>   completos de um candidato selecionado.
>
> Tratamento de Erros e Feedback:
> - Mensagens amigáveis para: arquivo inválido (formato diferente de PDF ou > 5 MB), falha de
>   leitura do PDF e confirmação de cadastro salvo com sucesso.
> - Permitir preenchimento manual caso a extração do PDF não identifique algum dado.

## Clarifications

### Session 2026-09-29

- Q: Quando alguém tentar cadastrar um candidato com um e-mail que já existe, o que o sistema
  deve fazer? → A: Bloquear o cadastro com a mensagem "Já existe um candidato com este e-mail",
  comparando o e-mail sem diferenciar maiúsculas e minúsculas.
- Q: Depois do cadastro, o arquivo PDF do currículo deve ser descartado ou guardado junto ao
  candidato? → A: Descartado logo depois da extração; nos detalhes aparecem só os campos do
  formulário.
- Q: A aplicação deve exigir login para cadastrar e consultar candidatos, ou pode ficar aberta
  para quem acessar o endereço? → A: Sem login nesta versão; a restrição fica explícita e o
  login entra como melhoria futura.
- Q: Um telefone com menos de 10 dígitos deve ser aceito, ou o sistema deve exigir o número
  completo com DDD? → A: Exigir 10 ou 11 dígitos (DDD + número fixo ou celular); menos que
  isso é recusado.

### Session 2026-09-29 (revisão do autor após a implementação)

- Q: A listagem deve ser paginada? → A: Sim. A paginação é feita no servidor, com 10 candidatos
  por página por padrão, e a página atual fica na URL.
- Q: Como os controles da paginação devem ser apresentados? → A: No padrão de rodapé de tabela da
  Taiga UI: total de candidatos, seletor de itens por página (10, 20 ou 50) e paginação.
- Q: Como a listagem deve se comportar com textos longos, inclusive sem espaços? → A: O texto
  quebra dentro da célula; a tabela não pode crescer além da tela por causa de um valor longo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastro manual de candidato (Priority: P1)

Uma pessoa recrutadora abre o formulário de cadastro, digita os dados do candidato (nome
completo, e-mail e, se quiser, telefone, área ou cargo de interesse e resumo profissional) e
salva. O sistema valida cada campo, aponta com clareza o que está errado e, quando tudo está
correto, confirma que o cadastro foi salvo.

**Why this priority**: é a base de toda a aplicação. O cadastro com PDF usa o mesmo formulário
e as mesmas regras, e o enunciado exige que o cadastro manual funcione sempre, mesmo sem PDF.
Sozinha, esta história já entrega um cadastro de candidatos utilizável.

**Independent Test**: preencher e salvar o formulário sem enviar nenhum arquivo, testando dados
válidos e inválidos, e confirmar que só os dados válidos são aceitos e geram a mensagem de
sucesso.

**Acceptance Scenarios**:

1. **Given** o formulário vazio, **When** a pessoa preenche nome e e-mail válidos e salva,
   **Then** o sistema grava o candidato, exibe a confirmação de cadastro salvo com sucesso e
   limpa o formulário para um novo cadastro.
2. **Given** o formulário com o nome em branco ou só com espaços, **When** a pessoa tenta
   salvar, **Then** o sistema não salva e mostra, junto ao campo Nome, que ele é obrigatório.
3. **Given** um e-mail sem formato válido (ex.: `maria@`), **When** a pessoa tenta salvar,
   **Then** o sistema não salva e mostra, junto ao campo E-mail, que o formato é inválido.
4. **Given** qualquer campo acima do limite de caracteres, **When** a pessoa tenta salvar,
   **Then** o sistema não salva e mostra, junto ao campo, o limite máximo permitido.
5. **Given** o telefone digitado com formatação, como `(41) 99999-9999` ou `(41) 3333-4444`,
   **When** a pessoa salva, **Then** o sistema aceita e guarda só os dígitos (`41999999999` ou
   `4133334444`).
6. **Given** um telefone incompleto, como `99999-9999` (sem DDD), **When** a pessoa tenta
   salvar, **Then** o sistema não salva e mostra, junto ao campo Telefone, que é preciso
   informar DDD + número (10 ou 11 dígitos).
7. **Given** só os campos obrigatórios preenchidos, **When** a pessoa salva, **Then** o cadastro
   é aceito, pois todos os outros campos são opcionais.
8. **Given** um candidato já cadastrado com `maria@email.com`, **When** a pessoa tenta salvar
   outro cadastro com `Maria@Email.com`, **Then** o sistema não salva, mostra junto ao campo
   E-mail a mensagem "Já existe um candidato com este e-mail" e mantém os dados digitados.

---

### User Story 2 - Consulta de candidatos cadastrados (Priority: P2)

A pessoa recrutadora abre a listagem de candidatos, vê os cadastros existentes e escolhe um
para abrir a tela de detalhes, que mostra todos os dados daquele candidato.

**Why this priority**: sem a consulta, o que foi cadastrado não pode ser recuperado nem
conferido. É a segunda metade do produto mínimo (cadastrar e consultar).

**Independent Test**: com alguns candidatos já cadastrados, abrir a listagem, conferir se todos
aparecem e abrir os detalhes de um deles, conferindo cada campo.

**Acceptance Scenarios**:

1. **Given** candidatos cadastrados, **When** a pessoa abre a listagem, **Then** vê até 10
   candidatos, com nome, e-mail, área ou cargo de interesse e data do cadastro, do mais recente
   para o mais antigo. O rodapé da tabela mostra o total ("42 candidatos"), o intervalo exibido
   ("Exibindo 1–10"), o seletor de itens por página e a paginação.
2. **Given** a listagem aberta, **When** a pessoa seleciona um candidato, **Then** abre a tela de
   detalhes com todos os campos do cadastro e a data e hora em que foi feito.
3. **Given** nenhum candidato cadastrado, **When** a pessoa abre a listagem, **Then** vê uma
   mensagem de lista vazia com um atalho para o formulário de cadastro.
4. **Given** um endereço de detalhes de candidato que não existe, **When** a pessoa acessa esse
   endereço, **Then** vê uma mensagem amigável de candidato não encontrado e um caminho de volta
   para a listagem.
5. **Given** um cadastro recém-salvo, **When** a pessoa abre a listagem, **Then** esse candidato
   já aparece, sem precisar de nenhuma outra ação.
6. **Given** mais de 10 candidatos, **When** a pessoa escolhe a página 2 na paginação, **Then**
   vê os próximos 10 e o endereço passa a ser `/candidatos?pagina=2`. Voltar dos detalhes para a
   listagem mantém a página. Ao escolher "20 por página", a lista passa a mostrar 20 itens
   (`?itens=20`), começando pela página que contém o primeiro item exibido.
7. **Given** um candidato com área de interesse longa (inclusive sem espaços), **When** a pessoa
   abre a listagem, **Then** o texto quebra dentro da célula e a página não rola na horizontal.

---

### User Story 3 - Pré-preenchimento do cadastro a partir de currículo em PDF (Priority: P3)

No mesmo formulário, a pessoa recrutadora pode anexar o currículo do candidato em PDF. O sistema
lê o arquivo e tenta preencher sozinho o Nome, o E-mail e o Telefone. A pessoa revisa, corrige
ou completa o que precisar e salva normalmente. Se o arquivo for inválido ou não puder ser lido,
o sistema explica o motivo e o cadastro manual continua disponível.

**Why this priority**: acelera o cadastro, mas depende do formulário e das validações da
História 1 e nunca pode ser pré-requisito para cadastrar.

**Independent Test**: com os currículos PDF de exemplo do repositório, anexar cada um e conferir
quais campos foram preenchidos. Depois, anexar arquivos inválidos (não-PDF, acima de 5 MB,
corrompido) e conferir as mensagens e que o cadastro manual continua funcionando.

**Acceptance Scenarios**:

1. **Given** o formulário vazio, **When** a pessoa anexa um PDF válido que contém nome, e-mail e
   telefone, **Then** o sistema mostra que está processando e, em seguida, preenche os três
   campos e indica que foram preenchidos a partir do currículo.
2. **Given** um PDF em que o telefone não é encontrado, **When** o processamento termina,
   **Then** o sistema preenche o que encontrou, avisa que o telefone não foi identificado e deixa
   o campo livre para preenchimento manual.
3. **Given** um arquivo que não é PDF (ex.: `.docx`, `.jpg`, ou um arquivo renomeado para
   `.pdf`), **When** a pessoa tenta anexá-lo, **Then** o sistema recusa o arquivo com uma
   mensagem dizendo que só são aceitos arquivos PDF, e o formulário continua como estava.
4. **Given** um PDF maior que 5 MB, **When** a pessoa tenta anexá-lo, **Then** o sistema recusa
   o arquivo com uma mensagem dizendo que o tamanho máximo é 5 MB, e o formulário continua como
   estava.
5. **Given** um PDF corrompido, protegido por senha ou sem texto legível (ex.: digitalizado como
   imagem), **When** o processamento falha, **Then** o sistema mostra uma mensagem amigável de
   falha de leitura e orienta a preencher manualmente, mantendo tudo o que já estava no
   formulário.
6. **Given** a pessoa já digitou o nome antes de anexar o PDF, **When** o processamento termina,
   **Then** o nome digitado é mantido e só os campos vazios são preenchidos.
7. **Given** campos preenchidos a partir do PDF, **When** a pessoa altera qualquer um deles e
   salva, **Then** o sistema grava os valores editados pela pessoa.

---

### Edge Cases

- **Tamanho no limite**: um PDF com exatamente 5 MB é aceito; com 1 byte a mais, é recusado.
- **Extensão falsa**: um arquivo com extensão `.pdf` cujo conteúdo não é PDF é recusado como
  formato inválido.
- **Vários e-mails ou telefones no currículo**: o sistema sugere um único valor por campo, o
  primeiro encontrado na ordem de leitura do documento.
- **Telefone com código do país** (ex.: `+55 41 99999-9999`): o valor extraído é normalizado
  para DDD + número (`41999999999`). No formulário, um valor com mais de 11 dígitos é recusado
  com uma mensagem pedindo DDD + número sem o código do país.
- **Números que não são telefone no currículo** (ex.: CEP com 8 dígitos, ou número sem DDD):
  não são usados como telefone, porque não têm 10 ou 11 dígitos. O campo fica como "não
  identificado".
- **Valor extraído que viola uma regra** (ex.: nome com mais de 250 caracteres): tratado como
  "não identificado" (FR-019).
- **Segundo PDF anexado**: o novo arquivo é processado e preenche apenas os campos que estiverem
  vazios naquele momento.
- **PDF removido depois da extração**: os valores já preenchidos continuam no formulário e o
  cadastro pode ser salvo.
- **Salvar durante o processamento do PDF**: salvar é permitido a qualquer momento. Se o
  processamento terminar depois do salvamento, o resultado é descartado.
- **Clique duplo em Salvar**: o sistema cria um único cadastro.
- **Falha ao salvar** (ex.: serviço indisponível): o sistema mostra uma mensagem amigável e
  mantém todos os dados digitados, para que a pessoa tente de novo.
- **Espaços nas bordas**: são removidos antes da validação. Um campo obrigatório preenchido só
  com espaços conta como vazio.
- **Acentos, cedilha e quebras de linha** (ex.: "Conceição", resumo com parágrafos): são
  preservados exatamente como digitados ou extraídos, na listagem e nos detalhes.
- **E-mail já cadastrado**: o cadastro é bloqueado (FR-012), mesmo que a diferença esteja só em
  maiúsculas e minúsculas ou em espaços nas bordas. Se dois cadastros com o mesmo e-mail forem
  salvos ao mesmo tempo, só um é gravado e o outro recebe a mensagem de e-mail já cadastrado.

## Requirements *(mandatory)*

### Functional Requirements

**Formulário e validação (vale para os dois modos de cadastro)**

- **FR-001**: O sistema DEVE oferecer um único formulário de cadastro, usado tanto no cadastro
  manual quanto no cadastro com PDF, com as mesmas regras de validação.
- **FR-002**: O campo **Nome completo** DEVE ser obrigatório e aceitar no máximo 250 caracteres.
- **FR-003**: O campo **E-mail** DEVE ser obrigatório, aceitar no máximo 250 caracteres e ter
  formato de e-mail válido (`nome@domínio.extensão`).
- **FR-004**: O campo **Telefone** DEVE ser opcional. Quando preenchido, DEVE ter 10 ou 11
  dígitos (DDD + número fixo de 8 dígitos ou celular de 9). O sistema DEVE aceitar a digitação
  com parênteses, espaços e hífen e guardar só os dígitos. Valores com letras, com outros
  símbolos, com menos de 10 ou com mais de 11 dígitos DEVEM ser recusados com uma mensagem
  pedindo DDD + número, sem o código do país.
- **FR-005**: O campo **Área ou cargo de interesse** DEVE ser opcional e aceitar no máximo 250
  caracteres.
- **FR-006**: O campo **Resumo profissional** DEVE ser opcional e aceitar no máximo 1000
  caracteres, preservando as quebras de linha.
- **FR-007**: O sistema DEVE remover os espaços no início e no fim de cada campo antes de
  validar. Um campo obrigatório só com espaços DEVE ser tratado como vazio.
- **FR-008**: O sistema DEVE mostrar cada erro de validação junto ao campo correspondente,
  dizendo qual regra foi violada, e NÃO DEVE salvar enquanto houver campo inválido.
- **FR-009**: O sistema DEVE reaplicar todas as regras de validação no momento de salvar e
  recusar dados inválidos mesmo que eles não venham do formulário.
- **FR-010**: Depois de salvar com sucesso, o sistema DEVE exibir a confirmação de cadastro
  salvo e deixar o formulário limpo para um novo cadastro.
- **FR-011**: Se o salvamento falhar por um motivo que não seja de validação, o sistema DEVE
  mostrar uma mensagem amigável e manter no formulário todos os dados digitados.
- **FR-012**: O e-mail DEVE ser único entre os candidatos, comparado sem diferenciar
  maiúsculas e minúsculas. Ao tentar salvar um e-mail já cadastrado, o sistema DEVE recusar o
  cadastro, mostrar junto ao campo E-mail a mensagem "Já existe um candidato com este e-mail" e
  manter os dados digitados.
- **FR-013**: O sistema DEVE impedir o envio duplicado do mesmo cadastro (ex.: clique duplo em
  Salvar).

**Cadastro com PDF**

- **FR-014**: O formulário DEVE permitir anexar, opcionalmente, um único arquivo de currículo
  em PDF de até 5 MB.
- **FR-015**: O sistema DEVE recusar arquivos que não sejam PDF, verificando o conteúdo do
  arquivo e não apenas a extensão, e arquivos maiores que 5 MB. Cada caso DEVE ter uma mensagem
  amigável própria (formato inválido ou tamanho excedido).
- **FR-016**: O sistema DEVE processar no servidor o PDF aceito, extrair o texto e tentar
  identificar o Nome completo, o E-mail e o Telefone do candidato.
- **FR-017**: O sistema DEVE preencher com os valores identificados apenas os campos que
  estiverem vazios, sem nunca sobrescrever o que a pessoa já digitou.
- **FR-018**: Ao final do processamento, o sistema DEVE informar quais campos foram preenchidos
  a partir do currículo e quais não foram identificados e precisam de preenchimento manual.
- **FR-019**: Um valor extraído só DEVE ser usado se passar nas mesmas regras do campo (FR-002 a
  FR-004). O telefone extraído DEVE ser normalizado para DDD + número, só com dígitos e sem o
  código do país.
- **FR-020**: Se o PDF estiver corrompido, protegido por senha ou sem texto legível, o sistema
  DEVE mostrar uma mensagem amigável de falha de leitura, orientando o preenchimento manual.
- **FR-021**: Nem a ausência de PDF nem qualquer falha no envio ou no processamento DEVEM
  impedir, atrasar ou apagar o preenchimento manual. A pessoa DEVE poder remover o arquivo
  anexado e continuar o cadastro.
- **FR-022**: Todos os campos preenchidos a partir do PDF DEVEM poder ser editados antes de
  salvar.
- **FR-023**: O sistema DEVE mostrar que o PDF está sendo processado e permitir que a pessoa
  continue editando o formulário durante o processamento.
- **FR-024**: O sistema DEVE descartar o arquivo PDF e o texto extraído assim que o
  processamento terminar, com sucesso ou com falha. Nem o arquivo nem o texto DEVEM ser
  guardados ou vinculados ao candidato. Do currículo, só ficam gravados os valores que
  estiverem nos campos no momento de salvar.

**Consulta**

- **FR-025**: O sistema DEVE listar os candidatos cadastrados **paginados, com 10 por página
  por padrão**, mostrando nome, e-mail, área ou cargo de interesse e data do cadastro, do mais
  recente para o mais antigo. A listagem DEVE mostrar o total de candidatos, permitir escolher
  10, 20 ou 50 itens por página, permitir navegar entre as páginas e manter a página e o tamanho
  no endereço (`?pagina=N&itens=M`). Textos longos DEVEM quebrar
  dentro da célula.
- **FR-026**: A partir da listagem, o sistema DEVE permitir abrir uma tela de detalhes com todos
  os dados do candidato selecionado, incluindo a data e a hora do cadastro.
- **FR-027**: Quando não houver candidatos, a listagem DEVE mostrar uma mensagem de lista vazia
  com um atalho para o cadastro.
- **FR-028**: Ao acessar os detalhes de um candidato que não existe, o sistema DEVE mostrar uma
  mensagem de candidato não encontrado e um caminho de volta para a listagem.
- **FR-029**: A listagem e os detalhes DEVEM mostrar os dados exatamente como foram salvos
  (acentos, cedilha, quebras de linha).

**Mensagens**

- **FR-030**: Todas as mensagens ao usuário DEVEM estar em português, em linguagem simples, sem
  códigos ou termos técnicos, e dizer o que aconteceu e o que a pessoa pode fazer em seguida.

### Key Entities *(include if feature involves data)*

- **Candidato**: a pessoa cadastrada. Atributos: nome completo, e-mail (único, sem diferenciar
  maiúsculas e minúsculas), telefone (só dígitos), área ou cargo de interesse, resumo
  profissional e data e hora do cadastro. É a entidade mostrada na listagem e nos detalhes.
- **Resultado da extração do currículo**: informação temporária, gerada ao processar um PDF,
  usada apenas para pré-preencher o formulário. Contém os valores sugeridos para nome, e-mail e
  telefone e a indicação de quais foram identificados ou do motivo da falha. Não é gravada, e
  o arquivo PDF de origem é descartado depois do processamento (FR-024).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa que nunca viu o formulário conclui um cadastro manual com todos os
  campos em menos de 2 minutos.
- **SC-002**: Com os currículos PDF de exemplo do repositório, o e-mail é pré-preenchido
  corretamente em 100% dos arquivos que contêm e-mail no texto, e o nome e o telefone em pelo
  menos 80% dos arquivos que contêm essas informações.
- **SC-003**: Para PDFs de até 5 MB, o resultado do processamento (campos preenchidos ou
  mensagem de falha) aparece em até 5 segundos depois de anexar o arquivo.
- **SC-004**: 100% dos arquivos inválidos (não-PDF ou acima de 5 MB) são recusados com uma
  mensagem que explica o motivo, sem gerar cadastro e sem alterar os dados já digitados.
- **SC-005**: Em 100% dos cenários de falha do PDF, a pessoa consegue concluir e salvar o
  cadastro manualmente sem recarregar a página nem redigitar dados.
- **SC-006**: Nenhum cadastro que viole as regras de campo é gravado, mesmo quando o envio é
  feito fora do formulário.
- **SC-007**: Partindo da listagem, a pessoa abre os detalhes completos de um candidato em no
  máximo 2 interações.
- **SC-008**: Com até 1.000 candidatos cadastrados, a listagem aparece em até 2 segundos.

## Assumptions

- **Usuários e acesso**: recrutadores e equipe de RH, todos com as mesmas permissões. Esta
  versão não tem login nem perfis de acesso: qualquer pessoa com acesso ao endereço da aplicação
  pode cadastrar e consultar. Isso é aceitável só porque a aplicação roda no ambiente local do
  desafio. O login DEVE constar como melhoria futura na seção 8 do `DESENVOLVIMENTO.md`.
- **Idioma**: interface, mensagens e currículos em português (pt-BR).
- **Telefone**: formato brasileiro, DDD + número, com 10 ou 11 dígitos, guardado só com
  dígitos. O limite de 11 caracteres do enunciado vale para os dígitos, sem contar a formatação
  digitada.
- **E-mail**: formato padrão `nome@domínio.extensão`, comparado sem diferenciar maiúsculas e
  minúsculas.
- **Tamanho do arquivo**: 5 MB = 5.242.880 bytes.
- **Extração**: tenta identificar só Nome, E-mail e Telefone. Área de interesse e Resumo
  profissional são sempre preenchidos manualmente. Só PDFs com texto selecionável são lidos; o
  reconhecimento de texto em imagens (OCR) está fora do escopo.
- **Processamento no servidor**: por exigência do enunciado, o PDF é processado pelo servidor
  da aplicação, não no navegador.
- **Um PDF por cadastro**: anexar outro arquivo substitui o anterior no formulário.
- **Retenção de dados**: como o PDF é descartado depois da extração, a aplicação guarda só os
  campos do formulário, o que reduz a exposição de dados pessoais (LGPD).
- **Fora do escopo desta versão**: login e controle de acesso, editar e excluir candidatos,
  busca e filtros na listagem.
- **Volume**: até alguns milhares de candidatos. A listagem é paginada no servidor, então o
  tempo de resposta não cresce com o total.
- **Dados de exemplo**: os currículos PDF do repositório usam só dados fictícios, conforme o
  Princípio VI da constituição.
