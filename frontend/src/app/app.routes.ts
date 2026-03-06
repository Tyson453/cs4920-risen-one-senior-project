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
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { AppLayoutComponent } from './layouts/app-layout/app-layout.component';
import { tempPasswordGuard } from './guards/temp-password.guard';
import { setPasswordAccessGuard } from './guards/set-password-access.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent },
      {
        path: 'set-password',
        component: SetPasswordComponent,
        canActivate: [setPasswordAccessGuard],
      },
    ],
  },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [AuthGuard, tempPasswordGuard],
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'daily-status', component: DailyStatusComponent },
      { path: 'projects', component: ProjectsComponent },
      { path: 'team-summary', component: TeamSummaryComponent },
      { path: 'time-off', component: TimeOffComponent },
      { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
      { path: 'certification-training', component: CertificationTrainingComponent },
      { path: 'reports/personal-dev', component: EmployeeDevelopmentComponent },
      { path: 'settings', component: SettingsComponent },
    ],
  },
  { path: '**', redirectTo: '/login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
