import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { NgModel } from '@angular/forms';
import { NgModule } from '@angular/core';
import { DailyStatusComponent } from './components/daily-status/daily-status.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'home', component: HomeComponent }, 
  {
    path: 'daily-status',
    component: DailyStatusComponent
  },
  ];

  @NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
    providers: []
  })

  export class AppRoutingModule{
   
  }