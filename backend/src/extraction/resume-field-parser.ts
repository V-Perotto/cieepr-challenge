import type { ResumeField } from '../domain/candidate.js';
import { EMAIL_PATTERN, isValidPhone, MAX_LENGTH } from '../domain/candidate-input.schema.js';

/**
 * Heurísticas puras para sugerir Nome, E-mail e Telefone a partir do texto de um currículo
 * (research R4). Só devolve valores que passam nas mesmas regras do formulário (FR-019).
 */

const EMAIL_IN_TEXT = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_IN_TEXT = /(?<!\d)(?:\+?55[\s.-]?)?\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}(?!\d)/g;
// Documentos que também são sequências numéricas longas e não podem virar telefone.
const DOCUMENT_LABEL_BEFORE = /(cpf|cep|rg|cnpj)\W{0,3}$/i;

const NAME_LABEL = /^\s*nome(?:\s+completo)?\s*[:\-–]\s*(.+?)\s*$/i;
// Letras (inclusive acentuadas), espaço, hífen, apóstrofo e ponto; sem dígitos nem @.
const NAME_CHARS = /^[\p{L}][\p{L}\s.'’-]*$/u;
const NAME_PARTICLES = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
const SECTION_WORDS = new Set([
  'curriculo',
  'curriculum',
  'vitae',
  'resume',
  'resumo',
  'contato',
  'contatos',
  'dados',
  'pessoais',
  'objetivo',
  'objetivos',
  'experiencia',
  'experiencias',
  'formacao',
  'academica',
  'profissional',
  'profissionais',
  'habilidades',
  'competencias',
  'idiomas',
  'cursos',
  'informacoes',
  'perfil',
  'endereco',
  'telefone',
  'celular',
  'email',
  'linkedin',
  'qualificacoes',
  'historico',
  'referencias',
]);

const stripAccents = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '');

function findEmail(text: string): string | null {
  const match = EMAIL_IN_TEXT.exec(text)?.[0];
  return match && match.length <= MAX_LENGTH.email && EMAIL_PATTERN.test(match) ? match : null;
}

function findPhone(text: string): string | null {
  for (const match of text.matchAll(PHONE_IN_TEXT)) {
    const before = text.slice(Math.max(0, match.index - 8), match.index);
    if (DOCUMENT_LABEL_BEFORE.test(before)) continue;

    let digits = match[0].replace(/\D/g, '');
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
    if (!isValidPhone(digits)) continue;
    // DDD de 11 a 99 (sem zero); celular com 11 dígitos começa com 9.
    if (!/^[1-9]{2}/.test(digits)) continue;
    if (digits.length === 11 && digits[2] !== '9') continue;
    return digits;
  }
  return null;
}

function toTitleCase(name: string): string {
  return name
    .split(' ')
    .map((word, index) => {
      const lower = word.toLocaleLowerCase('pt-BR');
      if (index > 0 && NAME_PARTICLES.has(lower)) return lower;
      return lower.replace(/(^|[-'’])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toLocaleUpperCase('pt-BR'));
    })
    .join(' ');
}

function normalizeName(candidate: string): string | null {
  const name = candidate.replace(/\s+/g, ' ').trim();
  if (name.length === 0 || name.length > MAX_LENGTH.fullName) return null;
  if (!NAME_CHARS.test(name)) return null;
  const words = name.split(' ');
  if (words.length < 2 || words.length > 6) return null;
  if (words.some((w) => SECTION_WORDS.has(stripAccents(w).toLowerCase()))) return null;
  const isUpperCase = name === name.toLocaleUpperCase('pt-BR');
  return isUpperCase ? toTitleCase(name) : name;
}

function findName(lines: string[]): string | null {
  for (const line of lines) {
    const labeled = NAME_LABEL.exec(line)?.[1];
    if (labeled) return normalizeName(labeled);
  }
  for (const line of lines) {
    const name = normalizeName(line);
    if (name) return name;
  }
  return null;
}

export function parseResumeFields(text: string): Record<ResumeField, string | null> {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return {
    fullName: findName(lines),
    email: findEmail(text),
    phone: findPhone(text),
  };
}
