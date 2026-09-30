/** Formata dígitos de telefone (10 ou 11) no padrão brasileiro; outros tamanhos saem como vieram. */
export function formatPhone(digits: string | null): string {
  if (!digits) return '';
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
}
