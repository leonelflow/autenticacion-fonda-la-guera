import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { AdminPanelComponent } from './pages/admin-panel/admin-panel.component';
import { VerifyCodeComponent } from './pages/verify-code/verify-code.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'verificar-codigo', component: VerifyCodeComponent },
  { path: 'inicio', component: HomeComponent },
  { path: 'registro', component: RegisterComponent },
  { path: 'panel', component: AdminPanelComponent },
  { path: '**', redirectTo: 'login' }
];
