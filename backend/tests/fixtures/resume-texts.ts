/** Textos de currículo (como o extrator devolve) para os testes do ResumeFieldParser. */
export const RESUME_TEXTS = {
  simple: [
    'Conceição Aparecida da Silva',
    'Rua das Flores, 123 - Curitiba/PR - CEP 80010-000',
    'E-mail: conceicao.silva@example.com | Tel.: (41) 99876-5432',
    'CPF: 123.456.789-09',
    'Resumo profissional',
    'Analista de RH com 8 anos de experiência.',
  ].join('\n'),

  twoColumnsUppercase: [
    'CONTATO',
    '+55 41 3333-4444',
    'joao.pereira@example.org',
    'Curitiba/PR',
    'JOÃO DA SILVA PEREIRA',
    'Desenvolvedor Full Stack',
  ].join('\n'),

  labeledName: [
    'Currículo',
    'Nome completo: Pedro Henrique Alves',
    'E-mail: pedro.alves@example.net',
    'Celular: 41 91234-5678',
  ].join('\n'),

  twoEmails: ['Maria Souza', 'maria@example.com', 'contato: rh@empresa.example.com'].join('\n'),

  cpfWithoutMask: ['Maria Souza', 'CPF 12945678909', 'maria@example.com'].join('\n'),

  mobileWithoutNine: ['Maria Souza', 'Tel.: (41) 81234-5678'].join('\n'),

  headingsOnly: ['Dados pessoais', 'Resumo profissional', 'Experiência profissional'].join('\n'),

  empty: '   \n\n ',
} as const;
