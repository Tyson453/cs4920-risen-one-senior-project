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

  getProjects(): Observable<Project[]> {
    const projects: Project[] = [
      {
        uuid: '51506e92-650c-4c84-a15f-752370243891',
        projectName: 'PR22',
        fullName: 'Project 22',
        status: 'Active',
        contract: 'C001',
        description: 'Enterprise web application development',
        hash: 'abc123',
        productManager: 'John Smith',
        productOwner: 'Jane Doe',
        startDate: '01/15/2024',
      },
      {
        uuid: '62617f03-761d-5d95-b26g-863481354902',
        projectName: 'ALPHA',
        fullName: 'Project Alpha',
        status: 'Active',
        contract: 'C002',
        description: 'Mobile application development initiative',
        hash: 'def456',
        productManager: 'Sarah Johnson',
        productOwner: 'Mike Williams',
        startDate: '03/01/2024',
      },
      {
        uuid: '73728g14-872e-6e06-c37h-974592465013',
        projectName: 'BETA',
        fullName: 'Project Beta',
        status: 'Inactive',
        contract: 'C003',
        description: 'Legacy system modernization',
        hash: 'ghi789',
        productManager: 'Robert Brown',
        productOwner: 'Emily Davis',
        startDate: '11/20/2023',
      },
    ];
    return of(projects);
  }
}
