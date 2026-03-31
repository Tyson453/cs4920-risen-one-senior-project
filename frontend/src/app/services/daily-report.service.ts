import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { RocConstants } from '../shared/constants/roc-constants';
import { of, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private url = environment.apiUrl;
  private emp = RocConstants.EMP_ROUTES.EMP;
  private admin = RocConstants.ADMIN_ROUTES.ADMIN;
  private reports = RocConstants.EMP_ROUTES.REPORTS;
  private projects = RocConstants.EMP_ROUTES.PROJECTS;
  private createNewReport = RocConstants.EMP_ROUTES.NEWREPORT;
  private createNewProject = RocConstants.ADMIN_ROUTES.NEWPROJECT;
  private delete = RocConstants.ADMIN_ROUTES.DELETE;
  private email = RocConstants.EMP_ROUTES.EMAIL;
  private baseUrl = environment.apiUrl;
  private reportUrl = this.baseUrl + '/getDailyReports/';

  constructor(private http: HttpClient) {}

  getAllReports(date: string) {
    // Legacy endpoint not implemented on new backend; kept as stub.
    return of([]);
  }

  getReports(userId: string) {
    // Legacy endpoint not implemented on new backend; use getReportsNew instead.
    return of([]);
  }

  getReportsNew(
    userId: string,
    pageSize: number,
    startRange: string,
    endRange: string
  ) {
    const params = {
      id: userId,
      limit: pageSize,
      start: startRange,
      end: endRange,
    };
    return this.http.get<any>(`${this.url}/daily-status`, { params });
  }

  addUserToReportsTable(params: any) {
    // New backend initializes reports on first upsert, so this is effectively a no-op.
    return of({ success: true });
  }

  getMonthlyList(
    userId: string,
    requester: string,
    month: string,
    year: string,
    date1: string,
    date2: string
  ) {
    const body = {
      userId,
      requesterId: requester,
      month,
      year,
      date1,
      date2,
    };
    return this.http.post<any>(`${this.url}/daily-status/monthly-email`, body);
  }

  getAllProjects() {
    // Prefer ProjectApiService for projects; kept for backward compatibility where used.
    return this.http.get<any>(this.url + '/projects');
  }

  sendEmail(requestParams: any) {
    return this.http.post<any>(this.url + '/daily-status/send-report-email', requestParams);
  }

  sendYearlyReportEmail(requestParams: any) {
    // Not implemented on backend; keep as stub.
    return of({ success: true });
  }

  sendPostReviewEmail(requestParams: any) {
    // Not implemented on backend; keep as stub.
    return of({ success: true });
  }

  createReport(requestParams: any, userId: string, date: string) {
    return this.http.put<any>(`${this.url}/daily-report/${userId}/${date}`, requestParams);
  }

  //Old call, need to adjust to new or delete
  deleteReport(userId: string, date: string) {
    return this.http.delete<any>(`${this.url}/daily-report/${userId}/${date}`);
  }
}
