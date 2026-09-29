import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { ResumeExtractionResult } from '../models/candidate.models';

/** POST /api/resume-extractions: envia o PDF (multipart, campo `file`) e recebe a sugestão de campos. */
@Injectable({ providedIn: 'root' })
export class ResumeExtractionApiService {
  private readonly http = inject(HttpClient);

  extract(file: File): Observable<ResumeExtractionResult> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<ResumeExtractionResult>('/api/resume-extractions', body);
  }
}
