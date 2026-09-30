import { describe, expect, it } from 'vitest';
import { splitSqlBatches } from '../../../src/db/migrate.js';

describe('splitSqlBatches', () => {
  it('separa nas linhas com GO', () => {
    expect(splitSqlBatches('CREATE TABLE a (x INT);\nGO\nCREATE INDEX i ON a (x);\nGO\n')).toEqual([
      'CREATE TABLE a (x INT);',
      'CREATE INDEX i ON a (x);',
    ]);
  });

  it('não diferencia maiúsculas e aceita espaços em volta', () => {
    expect(splitSqlBatches('SELECT 1\n  go  \nSELECT 2')).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('não quebra em GO dentro de outra palavra', () => {
    expect(splitSqlBatches("SELECT 'GOAL' AS GOTO")).toEqual(["SELECT 'GOAL' AS GOTO"]);
  });

  it('devolve um lote quando não há GO', () => {
    expect(splitSqlBatches('SELECT 1;\nSELECT 2;')).toEqual(['SELECT 1;\nSELECT 2;']);
  });

  it('descarta lotes vazios', () => {
    expect(splitSqlBatches('GO\n\nGO\n')).toEqual([]);
  });
});
