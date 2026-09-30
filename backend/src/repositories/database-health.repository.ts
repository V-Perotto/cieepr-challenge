import type sql from 'mssql';

/** Acesso ao banco para a checagem de saúde (constituição, Princípio V: só repositórios falam SQL). */
export interface DatabaseHealthRepository {
  /** @throws quando o banco não responde. */
  ping(): Promise<boolean>;
}

export class MssqlDatabaseHealthRepository implements DatabaseHealthRepository {
  constructor(private readonly pool: sql.ConnectionPool) {}

  async ping(): Promise<boolean> {
    await this.pool.request().query('SELECT 1');
    return true;
  }
}
