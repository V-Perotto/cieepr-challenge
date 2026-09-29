import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Candidate, CandidateInput, CandidateSummary } from '../models/candidate.models';

/** Acesso HTTP a /api/candidates (contracts/openapi.yaml). */
@Injectable({ providedIn: 'root' })
export class CandidatesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/candidates';

  create(input: CandidateInput): Observable<Candidate> {
    return this.http.post<Candidate>(this.baseUrl, input);
  }

  list(): Observable<CandidateSummary[]> {
    return this.http.get<CandidateSummary[]>(this.baseUrl);
  }

  getById(id: number): Observable<Candidate> {
    return this.http.get<Candidate>(`${this.baseUrl}/${id}`);
  }
}
