import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { RocConstants } from '../shared/constants/roc-constants';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private url = environment.rocApiUrl;
  private emp = RocConstants.EMP_ROUTES.EMP;
  private admin = RocConstants.ADMIN_ROUTES.ADMIN;
  private reports = RocConstants.EMP_ROUTES.REPORTS;
  private projects = RocConstants.EMP_ROUTES.PROJECTS;
  private createNewReport = RocConstants.EMP_ROUTES.NEWREPORT;
  private createNewProject = RocConstants.ADMIN_ROUTES.NEWPROJECT;
  private delete = RocConstants.ADMIN_ROUTES.DELETE;
  private email = RocConstants.EMP_ROUTES.EMAIL;
  private baseUrl = environment.rocApiUrl;
  private reportUrl = this.baseUrl + '/getDailyReports/';

  constructor(private http: HttpClient) {}
  
  getAllReports(date: string) {
    // return this.http.get<any>(this.reportUrl+date.replace('/', '-').replace('/', '-'));
    return of([]);
  }

  getReports(userId: string) {
    // return this.http.get<any>(this.url + '/portal/reports/' + userId);
    return of([]);
  }

  getReportsNew(userId: string, pageSize: number, startRange: string, endRange: string) {
    // return this.http.get<any>(`${this.url}/getDailyStatus?id=${userId}&limit=${pageSize}&start=${startRange}&end=${endRange}`);
    return of([]);
  }

  addUserToReportsTable(params: any) {
    // return this.http.post<any>(this.reportUrl, params)
    return of({ success: true });
  }

  getMonthlyList(userId: string, requester: string, month: string, year: string, date1: string, date2: string) {
    // return this.http.post<any>(this.url + '/monthlyEmailByUser/' + userId + "/" + requester + "/" + month + "/" + year+ "/" + date1+ "/" + date2, "");
    return of({ success: true });
  }

  getAllProjects() {
    // return this.http.get<any>(this.url + '/portal/' + this.projects);
    return of([]);
  }

  sendEmail(requestParams: any) {
    // return this.http.post<any>(this.url + "/send-report-email", requestParams);
    return of({ success: true });
  }

  sendYearlyReportEmail(requestParams: any) {
    // return this.http.post<any>(this.url + "/send-yearly-report-email", requestParams);
    return of({ success: true });
  }

  sendPostReviewEmail(requestParams: any) {
    // return this.http.post<any>(this.url + "/send-post-review-email", requestParams);
    return of({ success: true });
  }

  createReport(requestParams: any, userId: string, date: string) {
    // return this.http.put<any>(this.url + '/dailyReport/' + userId + "/" + date, requestParams);
    return of({ success: true });
  }

  //Old call, need to adjust to new or delete
  deleteReport(userId: string, date: string) {
    // return this.http.delete<any>(this.url + '/dailyReport/' + userId + "/" + date);
    return of({ success: true });
  }
}
