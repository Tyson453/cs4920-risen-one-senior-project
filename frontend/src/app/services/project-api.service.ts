import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { RocConstants } from '../shared/constants/roc-constants';
import { Project } from '../models/project';
import { Employee } from '../models/employee';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProjectApiService {
  private baseUrl = environment.rocApiUrl;
  private projectUrl = this.baseUrl + '/portal/' + RocConstants.APIS.PROJECTS;

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

  getProjects() {
    return of([
      { uuid: '51506e92-650c-4c84-a15f-752370243891', projectName: 'PR22', projectFullName: 'Project 22', status: 'Active' },
      { uuid: '62617f03-761d-5d95-b26g-863481354902', projectName: 'ALPHA', projectFullName: 'Project Alpha', status: 'Active' },
    ]);
  }
}
