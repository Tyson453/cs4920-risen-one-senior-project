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
import { AuthGuard } from './auth.guard';
import { adminGuard } from './guards/admin.guard';
import { SettingsComponent } from './components/settings/settings.component';
import { SetPasswordComponent } from './components/set-password/set-password.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'set-password', component: SetPasswordComponent, canActivate: [AuthGuard] },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'daily-status', component: DailyStatusComponent, canActivate: [AuthGuard] },
  { path: 'projects', component: ProjectsComponent, canActivate: [AuthGuard] },
  { path: 'team-summary', component: TeamSummaryComponent, canActivate: [AuthGuard] },
  { path: 'time-off', component: TimeOffComponent, canActivate: [AuthGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [AuthGuard, adminGuard] },
  { path: 'certification-training', component: CertificationTrainingComponent, canActivate: [AuthGuard] },
  { path: 'reports/personal-dev', component: EmployeeDevelopmentComponent, canActivate: [AuthGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
