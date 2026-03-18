import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { PTORequest } from '../models/pto';

@Injectable({
  providedIn: 'root',
})
export class PTOService {
  private baseUrl = environment.apiUrl;
  private ptoPath = 'pto';

  constructor(private http: HttpClient) {}

  private normalize(record: any): PTORequest {
    return { ...record, id: record.ptoId || record.id };
  }

  getPTORequests(userId: string): Observable<PTORequest[]> {
    return this.http
      .get<any[]>(`${this.baseUrl}/${this.ptoPath}/user/${userId}`)
      .pipe(map((records) => records.map((r) => this.normalize(r))));
  }

  createPTO(pto: Partial<PTORequest>): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${this.ptoPath}`, pto);
  }

  getPendingPTOApprovals(): Observable<PTORequest[]> {
    return this.http
      .get<any[]>(`${this.baseUrl}/${this.ptoPath}/supervisor/pending`)
      .pipe(map((records) => records.map((r) => this.normalize(r))));
  }

  approvePTO(ptoId: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${this.ptoPath}/${ptoId}/approve`,
      {}
    );
  }

  denyPTO(ptoId: string, reason?: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${this.ptoPath}/${ptoId}/deny`,
      { reason: reason || '' }
    );
  }
}
