import type { MaskitoOptions } from '@maskito/core';

const D = /\d/;
const LANDLINE = ['(', D, D, ')', ' ', D, D, D, D, '-', D, D, D, D];
const MOBILE = ['(', D, D, ')', ' ', D, D, D, D, D, '-', D, D, D, D];

/** Máscara brasileira: (00) 0000-0000 até 10 dígitos e (00) 00000-0000 com 11. */
export const PHONE_MASK: MaskitoOptions = {
  mask: ({ value }) => (value.replace(/\D/g, '').length > 10 ? MOBILE : LANDLINE),
};
