import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../../../src/config/env.js';

describe('loadConfig', () => {
  it('aplica os padrões quando só a senha é informada', () => {
    const config = loadConfig({ DB_PASSWORD: 'x' });
    expect(config).toEqual({
      db: { host: 'localhost', port: 1433, name: 'recrutamento', user: 'sa', password: 'x' },
      port: 3000,
      logLevel: 'info',
      pdfExtractionTimeoutMs: 4000,
    });
  });

  it('converte valores numéricos', () => {
    const config = loadConfig({ DB_PASSWORD: 'x', DB_PORT: '14330', PORT: '8080', PDF_EXTRACTION_TIMEOUT_MS: '2500' });
    expect(config.db.port).toBe(14330);
    expect(config.port).toBe(8080);
    expect(config.pdfExtractionTimeoutMs).toBe(2500);
  });

  it('recusa DB_NAME com caracteres fora de [A-Za-z0-9_]', () => {
    expect(() => loadConfig({ DB_PASSWORD: 'x', DB_NAME: 'rec; DROP' })).toThrow(ConfigError);
  });

  it('lista só as chaves inválidas, sem expor valores', () => {
    try {
      loadConfig({ DB_PASSWORD: '', DB_PORT: 'abc', LOG_LEVEL: 'verbose' });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      const configError = err as ConfigError;
      expect(configError.invalidKeys.sort()).toEqual(['DB_PASSWORD', 'DB_PORT', 'LOG_LEVEL']);
      expect(configError.message).not.toContain('abc');
      expect(configError.message).not.toContain('verbose');
    }
  });
});
