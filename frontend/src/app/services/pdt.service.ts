import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { RocConstants } from '../shared/constants/roc-constants';
import { PDT } from '../models/pdt';

@Injectable({
  providedIn: 'root',
})
export class PDTService {
  private baseUrl = environment.rocApiUrl;
  private pdtEndpoint = RocConstants.APIS.PDT;
  private auditEndpoint = RocConstants.APIS.DEVELOPMENTAUDIT;

  constructor(private http: HttpClient) {}

  /**
   * Get all PDT records for a specific user
   * @param userId - The user ID to fetch records for
   * @returns Observable of PDT array
   */
  getPDTRecords(userId: string): Observable<PDT[]> {
    // return this.http.get<PDT[]>(`${this.baseUrl}${this.pdtEndpoint}/${userId}`);
    return of([]);
  }

  /**
   * Get a specific PDT record by ID
   * @param pdtId - The PDT record ID
   * @returns Observable of PDT
   */
  getPDTRecord(pdtId: string): Observable<PDT> {
    // return this.http.get<PDT>(`${this.baseUrl}${this.pdtEndpoint}/record/${pdtId}`);
    return of({
      id: '',
      createdDate: '',
      createdTimestamp: '',
      empName: '',
      shortTermGoals: '',
      mediumTermGoals: '',
      longTermGoals: '',
      developmentNeeds: '',
      actionPlan: '',
      empSignature: '',
      superSignature: ''
    });
  }

  /**
   * Create a new PDT record
   * @param pdt - The PDT data to create
   * @returns Observable with success status and new record ID
   */
  createPDT(pdt: Partial<PDT>): Observable<any> {
    // return this.http.post<any>(`${this.baseUrl}${this.pdtEndpoint}`, pdt);
    return of({ success: true, id: 'mock-id-' + Date.now() });
  }

  /**
   * Update an existing PDT record
   * @param pdtId - The PDT record ID to update
   * @param pdt - The updated PDT data
   * @returns Observable with success status
   */
  updatePDT(pdtId: string, pdt: Partial<PDT>): Observable<any> {
    // return this.http.put<any>(`${this.baseUrl}${this.pdtEndpoint}/${pdtId}`, pdt);
    return of({ success: true });
  }

  /**
   * Delete a PDT record
   * @param pdtId - The PDT record ID to delete
   * @returns Observable with success status
   */
  deletePDT(pdtId: string): Observable<any> {
    // return this.http.delete<any>(`${this.baseUrl}${this.pdtEndpoint}/${pdtId}`);
    return of({ success: true });
  }

  /**
   * Audit PDT records (for compliance/tracking)
   * @param userId - The user ID to audit
   * @returns Observable with audit results
   */
  auditDevelopments(userId: string): Observable<any> {
    // return this.http.get<any>(`${this.baseUrl}${this.auditEndpoint}/${userId}`);
    return of({ success: true, auditLog: [] });
  }
}
