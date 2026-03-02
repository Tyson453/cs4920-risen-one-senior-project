import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { RocConstants } from '../shared/constants/roc-constants';
import { Project } from '../models/project';
import { Employee } from '../models/employee';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProjectApiService {
  private baseUrl = environment.apiUrl;
  private projectUrl = this.baseUrl + '/portal/' + RocConstants.APIS.PROJECTS;
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  public getProjectInfo(uuid: string) {
    return of({ uuid, projectName: 'Mock Project', status: 'Active' });
  }

  addProject(requestParams: any) {
    return of({ uuid: 'new-uuid', ...requestParams });
  }

  editProject(projectInfo: Project) {
    return of(projectInfo);
  }

  deleteProject(uuid: string) {
    return of({ success: true });
  }

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/projects`);
  }
}
