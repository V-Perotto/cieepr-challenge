// Gera os currículos PDF de exemplo (dados FICTÍCIOS, domínios example.*).
// Uso (na raiz do repositório): pnpm samples:generate
// O resultado esperado de cada arquivo está em samples/expected.json e samples/README.md.
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const OUT_DIR = dirname(fileURLToPath(import.meta.url));
// Data fixa para que os arquivos gerados não mudem a cada execução.
const CREATED_AT = new Date('2026-09-29T12:00:00Z');

function render(draw, options = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 56,
      info: { Title: 'Currículo (exemplo fictício)', Author: 'CIEE-PR Challenge', CreationDate: CREATED_AT },
      ...options,
    });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    draw(doc);
    doc.end();
  });
}

const section = (doc, title) => doc.moveDown(0.8).font('Helvetica-Bold').fontSize(13).text(title).font('Helvetica').fontSize(11);

function simpleLayout(doc) {
  doc.font('Helvetica-Bold').fontSize(20).text('Conceição Aparecida da Silva');
  doc.font('Helvetica').fontSize(11).moveDown(0.3);
  doc.text('Rua das Flores, 123 - Curitiba/PR - CEP 80010-000');
  doc.text('E-mail: conceicao.silva@example.com | Tel.: (41) 99876-5432');
  doc.text('CPF: 123.456.789-09');
  section(doc, 'Resumo profissional');
  doc.text('Analista de RH com 8 anos de experiência em recrutamento e seleção.');
  section(doc, 'Experiência');
  doc.text('2019 - atual: Analista de Recursos Humanos na Empresa Exemplo Ltda.');
}

const samples = [
  ['01-layout-simples.pdf', () => render(simpleLayout)],
  [
    '02-duas-colunas.pdf',
    () =>
      render((doc) => {
        doc.font('Helvetica-Bold').fontSize(10).text('CONTATO', 40, 60, { width: 160 });
        doc.font('Helvetica').fontSize(10);
        doc.text('+55 41 3333-4444', 40, 78, { width: 160 });
        doc.text('joao.pereira@example.org', 40, 94, { width: 160 });
        doc.text('Curitiba/PR', 40, 110, { width: 160 });
        doc.font('Helvetica-Bold').fontSize(22).text('JOÃO PEREIRA', 230, 56, { width: 320 });
        doc.font('Helvetica').fontSize(12).text('Desenvolvedor Full Stack', 230, 86, { width: 320 });
        doc.fontSize(11).text('Experiência com Angular, Node.js e SQL Server.', 230, 120, { width: 320 });
      }),
  ],
  [
    '03-sem-telefone.pdf',
    () =>
      render((doc) => {
        doc.font('Helvetica-Bold').fontSize(20).text('Ana Beatriz Costa');
        doc.font('Helvetica').fontSize(11).moveDown(0.3);
        doc.text('ana.costa@example.com');
        doc.text('Porto Alegre/RS');
        section(doc, 'Objetivo');
        doc.text('Atuar como analista de dados júnior.');
      }),
  ],
  [
    '04-rotulo-nome.pdf',
    () =>
      render((doc) => {
        doc.font('Helvetica-Bold').fontSize(18).text('Currículo');
        doc.font('Helvetica').fontSize(11).moveDown(0.5);
        doc.text('Nome completo: Pedro Henrique Alves');
        doc.text('E-mail: pedro.alves@example.net');
        doc.text('Celular: 41 91234-5678');
        section(doc, 'Formação');
        doc.text('Bacharelado em Administração - 2022');
      }),
  ],
  [
    '05-digitalizado-sem-texto.pdf',
    () =>
      render((doc) => {
        // Só formas desenhadas, sem nenhum texto: simula um currículo digitalizado como imagem.
        doc.rect(56, 56, 480, 40).fill('#9aa0a6');
        for (let y = 120; y < 700; y += 24) doc.rect(56, y, 300 + ((y * 7) % 180), 10).fill('#c4c7cc');
      }),
  ],
  [
    '06-protegido-por-senha.pdf',
    () => render(simpleLayout, { userPassword: 'segredo', ownerPassword: 'segredo-dono', pdfVersion: '1.7' }),
  ],
];

for (const [name, build] of samples) {
  await writeFile(join(OUT_DIR, name), await build());
  console.log(`gerado: samples/${name}`);
}

// 07: primeiro terço dos bytes do 01 (começa com %PDF-, mas a estrutura está truncada).
const simple = await render(simpleLayout);
await writeFile(join(OUT_DIR, '07-corrompido.pdf'), simple.subarray(0, Math.floor(simple.length / 3)));
console.log('gerado: samples/07-corrompido.pdf');

// 08: conteúdo de ZIP (assinatura PK\x03\x04) com extensão .pdf.
await writeFile(
  join(OUT_DIR, '08-nao-e-pdf.pdf'),
  Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from(' este arquivo não é um PDF, é um ZIP renomeado.')]),
);
console.log('gerado: samples/08-nao-e-pdf.pdf');
