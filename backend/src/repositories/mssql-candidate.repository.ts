import sql from 'mssql';
import type { Candidate, CandidateSummary, NewCandidate } from '../domain/candidate.js';
import { EmailAlreadyExistsError } from '../domain/errors.js';
import type { CandidateRepository } from './candidate.repository.js';

interface CandidateRow {
  Id: number;
  FullName: string;
  Email: string;
  Phone: string | null;
  AreaOfInterest: string | null;
  ProfessionalSummary: string | null;
  CreatedAt: Date;
}

// Violação de UNIQUE (2627) ou de índice único (2601) no SQL Server.
const UNIQUE_VIOLATION = new Set([2627, 2601]);

function isUniqueViolation(err: unknown): boolean {
  return err instanceof sql.RequestError && err.number !== undefined && UNIQUE_VIOLATION.has(err.number);
}

function toCandidate(row: CandidateRow): Candidate {
  return {
    id: row.Id,
    fullName: row.FullName,
    email: row.Email,
    phone: row.Phone,
    areaOfInterest: row.AreaOfInterest,
    professionalSummary: row.ProfessionalSummary,
    createdAt: row.CreatedAt,
  };
}

export class MssqlCandidateRepository implements CandidateRepository {
  constructor(private readonly pool: sql.ConnectionPool) {}

  async create(candidate: NewCandidate): Promise<Candidate> {
    try {
      const result = await this.pool
        .request()
        .input('fullName', sql.NVarChar(250), candidate.fullName)
        .input('email', sql.NVarChar(250), candidate.email)
        .input('phone', sql.VarChar(11), candidate.phone)
        .input('areaOfInterest', sql.NVarChar(250), candidate.areaOfInterest)
        .input('professionalSummary', sql.NVarChar(1000), candidate.professionalSummary)
        .query<CandidateRow>(`
          INSERT INTO dbo.Candidates (FullName, Email, Phone, AreaOfInterest, ProfessionalSummary)
          OUTPUT INSERTED.Id, INSERTED.FullName, INSERTED.Email, INSERTED.Phone,
                 INSERTED.AreaOfInterest, INSERTED.ProfessionalSummary, INSERTED.CreatedAt
          VALUES (@fullName, @email, @phone, @areaOfInterest, @professionalSummary)`);
      const row = result.recordset[0];
      if (!row) throw new Error('INSERT não devolveu a linha criada');
      return toCandidate(row);
    } catch (err) {
      if (isUniqueViolation(err)) throw new EmailAlreadyExistsError();
      throw err;
    }
  }

  async list(): Promise<CandidateSummary[]> {
    const result = await this.pool.request().query<Omit<CandidateRow, 'Phone' | 'ProfessionalSummary'>>(`
      SELECT Id, FullName, Email, AreaOfInterest, CreatedAt
      FROM dbo.Candidates
      ORDER BY CreatedAt DESC, Id DESC`);
    return result.recordset.map((row) => ({
      id: row.Id,
      fullName: row.FullName,
      email: row.Email,
      areaOfInterest: row.AreaOfInterest,
      createdAt: row.CreatedAt,
    }));
  }

  async findById(id: number): Promise<Candidate | null> {
    const result = await this.pool.request().input('id', sql.Int, id).query<CandidateRow>(`
      SELECT Id, FullName, Email, Phone, AreaOfInterest, ProfessionalSummary, CreatedAt
      FROM dbo.Candidates
      WHERE Id = @id`);
    const row = result.recordset[0];
    return row ? toCandidate(row) : null;
  }
}
