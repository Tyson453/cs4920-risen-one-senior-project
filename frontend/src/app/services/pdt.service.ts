import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { PDT } from '../models/pdt';

@Injectable({
  providedIn: 'root',
})
export class PDTService {
  private baseUrl = environment.apiUrl;
  private pdtPath = 'pdt';

  constructor(private http: HttpClient) {}

  /** Normalize backend record (uses pdtId as primary key) to the PDT interface (uses id). */
  private normalize(record: any): PDT {
    return { ...record, id: record.pdtId || record.id };
  }

  /**
   * Get all PDT records for a specific user.
   */
  getPDTRecords(userId: string): Observable<PDT[]> {
    return this.http
      .get<any[]>(`${this.baseUrl}/${this.pdtPath}/user/${userId}`)
      .pipe(map((records) => records.map((r) => this.normalize(r))));
  }

  /**
   * Create a new PDT record (status defaults to DRAFT on the backend).
   */
  createPDT(pdt: Partial<PDT>): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${this.pdtPath}`, pdt);
  }

  /**
   * Update an existing PDT record (only allowed for DRAFT / CHANGES_REQUESTED).
   */
  updatePDT(pdtId: string, pdt: Partial<PDT>): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${this.pdtPath}/${pdtId}`, pdt);
  }

  /**
   * Delete a PDT record (only allowed for DRAFT status).
   */
  deletePDT(pdtId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${this.pdtPath}/${pdtId}`);
  }

  /**
   * Submit a PDT for supervisor approval.
   * Transitions status: DRAFT | CHANGES_REQUESTED → PENDING_APPROVAL.
   */
  submitPDTForApproval(pdtId: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${this.pdtPath}/${pdtId}/submit`,
      {}
    );
  }

  /**
   * Get all PDTs with status PENDING_APPROVAL for the calling supervisor.
   */
  getPendingApprovals(): Observable<PDT[]> {
    return this.http
      .get<any[]>(`${this.baseUrl}/${this.pdtPath}/supervisor/pending`)
      .pipe(map((records) => records.map((r) => this.normalize(r))));
  }

  /**
   * Supervisor approves a PDT. Transitions PENDING_APPROVAL → APPROVED.
   */
  approvePDT(pdtId: string, supervisorSignature: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${this.pdtPath}/${pdtId}/approve`,
      { supervisorSignature }
    );
  }

  /**
   * Supervisor requests changes on a PDT. Transitions PENDING_APPROVAL → CHANGES_REQUESTED.
   */
  requestPDTChanges(pdtId: string, comments: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${this.pdtPath}/${pdtId}/request-changes`,
      { comments }
    );
  }
}
