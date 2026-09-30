import { describe, expect, it } from 'vitest';
import type { DatabaseHealthRepository } from '../../../src/repositories/database-health.repository.js';
import { HealthService } from '../../../src/services/health.service.js';

const repository = (ping: DatabaseHealthRepository['ping']): DatabaseHealthRepository => ({ ping });

describe('HealthService', () => {
  it('isDatabaseUp é verdadeiro quando o repositório responde', async () => {
    expect(await new HealthService(repository(async () => true)).isDatabaseUp()).toBe(true);
  });

  it('isDatabaseUp é falso quando o repositório devolve false', async () => {
    expect(await new HealthService(repository(async () => false)).isDatabaseUp()).toBe(false);
  });

  it('isDatabaseUp é falso quando o repositório lança erro (banco fora do ar)', async () => {
    const failing = repository(async () => {
      throw new Error('ECONNREFUSED');
    });
    expect(await new HealthService(failing).isDatabaseUp()).toBe(false);
  });
});
