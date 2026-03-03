import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { ProjectApiService } from '../../services/project-api.service';
import { DialogService } from '../../services/dialog.service';
import { Project } from '../../models/project';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css'
})
export class ProjectsComponent implements OnInit {
  projects: Project[] = [];
  isLoading = true;
  displayedColumns: string[] = [
    'projectName',
    'fullName',
    'status',
    'productManager',
    'productOwner',
    'startDate',
  ];
  openSpinner = () => {};
  closeSpinner = () => {};

  constructor(
    private projectApiService: ProjectApiService,
    private dialogService: DialogService
  ) {
    this.openSpinner = () => this.dialogService.openSpinner();
    this.closeSpinner = () => this.dialogService.closeSpinner();
  }

  ngOnInit(): void {
    this.loadProjects();
  }

  private loadProjects(): void {
    this.isLoading = true;
    this.openSpinner();
    this.projectApiService.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.isLoading = false;
        this.closeSpinner();
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.dialogService.standardError(
          error,
          'Load Error',
          'Failed to load projects'
        );
        this.isLoading = false;
        this.closeSpinner();
      },
    });
  }

  getStatusClass(status: string): string {
    return status === 'Active' ? 'status-active' : 'status-inactive';
  }
}
