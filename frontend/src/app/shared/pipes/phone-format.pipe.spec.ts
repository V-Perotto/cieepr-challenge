import { PhoneFormatPipe } from './phone-format.pipe';

describe('PhoneFormatPipe', () => {
  const pipe = new PhoneFormatPipe();

  it('formata celular com 11 dígitos', () => {
    expect(pipe.transform('41999999999')).toBe('(41) 99999-9999');
  });

  it('formata fixo com 10 dígitos', () => {
    expect(pipe.transform('4133334444')).toBe('(41) 3333-4444');
  });

  it('devolve string vazia para null', () => {
    expect(pipe.transform(null)).toBe('');
  });
});
