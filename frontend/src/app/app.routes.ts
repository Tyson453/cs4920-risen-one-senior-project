import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminComponent } from './components/admin/admin.component';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { DailyStatusComponent } from './components/daily-status/daily-status.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { TeamSummaryComponent } from './components/team-summary/team-summary.component';
import { TimeOffComponent } from './components/time-off/time-off.component';
import { CertificationTrainingComponent } from './components/certification-training/certification-training.component';
import { EmployeeDevelopmentComponent } from './components/employee-development/employee-development.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'daily-status', component: DailyStatusComponent },
  { path: 'projects', component: ProjectsComponent },
  { path: 'team-summary', component: TeamSummaryComponent },
  { path: 'time-off', component: TimeOffComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'certification-training', component: CertificationTrainingComponent },
  { path: 'reports/personal-dev', component: EmployeeDevelopmentComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
