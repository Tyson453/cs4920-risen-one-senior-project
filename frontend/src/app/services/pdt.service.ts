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
  private baseUrl = environment.apiUrl;
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
      superSignature: '',
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

  /**
   * Submit a PDT record for supervisor approval
   * This triggers an email notification to the supervisor with a link/PDF
   * and changes the PDT status to 'pending-approval'
   * @param pdtId - The PDT record ID to submit for approval
   * @returns Observable with success status
   */
  submitPDTForApproval(pdtId: string): Observable<any> {
    // return this.http.post<any>(`${this.baseUrl}${this.pdtEndpoint}/${pdtId}/submit`, {});
    return of({ success: true, message: 'PDT submitted for approval' });
  }

  /**
   * Approve a PDT record (supervisor action)
   * Updates the PDT status to 'approved' and adds supervisor signature
   * @param pdtId - The PDT record ID to approve
   * @param supervisorSignature - Supervisor's signature
   * @returns Observable with success status
   */
  approvePDT(pdtId: string, supervisorSignature: string): Observable<any> {
    // return this.http.post<any>(`${this.baseUrl}${this.pdtEndpoint}/${pdtId}/approve`, { supervisorSignature });
    return of({ success: true, message: 'PDT approved successfully' });
  }

  /**
   * Request changes to a PDT record (supervisor action)
   * Updates the PDT status back to 'draft' and notifies employee of requested changes
   * @param pdtId - The PDT record ID
   * @param changeComments - Comments explaining what changes are needed
   * @returns Observable with success status
   */
  requestPDTChanges(pdtId: string, changeComments: string): Observable<any> {
    // return this.http.post<any>(`${this.baseUrl}${this.pdtEndpoint}/${pdtId}/request-changes`, { comments: changeComments });
    return of({ success: true, message: 'Change request sent to employee' });
  }

  /**
   * Send PDT approval email notification to supervisor
   * Includes a PDF of the form and link to approve/request changes
   * @param pdtId - The PDT record ID
   * @param supervisorEmail - Supervisor's email address
   * @returns Observable with success status
   */
  sendPDTApprovalEmail(
    pdtId: string,
    supervisorEmail: string
  ): Observable<any> {
    // return this.http.post<any>(`${this.baseUrl}${this.pdtEndpoint}/${pdtId}/send-approval-email`, { supervisorEmail });
    return of({ success: true, message: 'Approval email sent to supervisor' });
  }

  /**
   * Get all pending PDT approvals for a supervisor
   * @param supervisorId - The supervisor's user ID
   * @returns Observable of pending PDT records
   */
  getPendingApprovals(supervisorId: string): Observable<PDT[]> {
    // return this.http.get<PDT[]>(`${this.baseUrl}${this.pdtEndpoint}/pending-approvals/${supervisorId}`);
    return of([]);
  }
}
