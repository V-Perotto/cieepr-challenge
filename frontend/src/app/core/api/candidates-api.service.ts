import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Candidate, CandidateInput, CandidatePage } from '../models/candidate.models';

/** Acesso HTTP a /api/candidates (contracts/openapi.yaml). */
@Injectable({ providedIn: 'root' })
export class CandidatesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/candidates';

  create(input: CandidateInput): Observable<Candidate> {
    return this.http.post<Candidate>(this.baseUrl, input);
  }

  list(page: number, pageSize: number): Observable<CandidatePage> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<CandidatePage>(this.baseUrl, { params });
  }

  getById(id: number): Observable<Candidate> {
    return this.http.get<Candidate>(`${this.baseUrl}/${id}`);
  }
}
