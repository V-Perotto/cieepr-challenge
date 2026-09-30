# Currículos de exemplo

PDFs para testar a importação de currículo (US3). **Todos os dados são fictícios**: nomes
inventados, e-mails em domínios `example.*` reservados para documentação, CPF e CEP de
exemplo. Nenhum dado pessoal real (LGPD).

Os arquivos são gerados por [`generate-samples.mjs`](generate-samples.mjs) com `pdfkit`, de
forma determinística:

```bash
pnpm install            # na raiz do repositório
pnpm samples:generate
```

## Resultado esperado

A versão legível por máquina está em [`expected.json`](expected.json), usada pelos testes de
integração do backend.

| Arquivo | Layout / objetivo | Resultado esperado |
|---------|-------------------|--------------------|
| `01-layout-simples.pdf` | Uma coluna; rótulos "E-mail:" e "Tel.:"; CPF e CEP como ruído | Nome **Conceição Aparecida da Silva**, e-mail **conceicao.silva@example.com**, telefone **41998765432** |
| `02-duas-colunas.pdf` | Contato na lateral; nome em MAIÚSCULAS; telefone fixo com +55 | Nome **João Pereira**, e-mail **joao.pereira@example.org**, telefone **4133334444** |
| `03-sem-telefone.pdf` | Sem telefone | Nome **Ana Beatriz Costa**, e-mail **ana.costa@example.com**; telefone **não identificado** |
| `04-rotulo-nome.pdf` | Título "Currículo" antes do nome; rótulo "Nome completo:" | Nome **Pedro Henrique Alves**, e-mail **pedro.alves@example.net**, telefone **41912345678** |
| `05-digitalizado-sem-texto.pdf` | Só imagem/formas, sem texto (simula PDF escaneado) | HTTP 422 `PDF_UNREADABLE`, motivo `no_text` |
| `06-protegido-por-senha.pdf` | Mesmo conteúdo do 01, protegido pela senha `segredo` | HTTP 422 `PDF_UNREADABLE`, motivo `encrypted` |
| `07-corrompido.pdf` | Primeiro terço dos bytes do 01 (estrutura truncada) | HTTP 422 `PDF_UNREADABLE`, motivo `corrupted` |
| `08-nao-e-pdf.pdf` | Conteúdo de ZIP com extensão `.pdf` | HTTP 415 `INVALID_FILE_TYPE` |

## Arquivo acima de 5 MB

Não é versionado, para não inflar o repositório. Para gerar um (começa com `%PDF-` e tem ~6 MB):

```bash
{ printf '%%PDF-1.7\n'; head -c 6000000 /dev/zero; } > /tmp/grande.pdf
```

Resultado esperado: HTTP 413 `FILE_TOO_LARGE`. No navegador, o arquivo é recusado antes do
envio, com a mensagem "O arquivo tem mais de 5 MB. Envie um PDF de até 5 MB.".
