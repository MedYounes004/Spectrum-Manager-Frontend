import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { UsersComponent } from './pages/users/users.component';
import { AuthorizationsComponent } from './pages/authorizations/authorizations.component';
import { InvoicesComponent } from './pages/invoices/invoices.component';
import { ClientsComponent } from './pages/clients/clients.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { ForecastingComponent } from './pages/forecasting/forecasting.component';
import { LoginComponent } from './pages/login/login.component';
import { ClientSpaceComponent } from './pages/client-space/client-space.component';
import { CostComponent } from './pages/cost/cost.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },

  // Dashboard — restrict to internal staff (not VIEWER or CLIENT)
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard, roleGuard(['ADMIN', 'OPERATOR', 'SPECTRUM_MANAGER', 'FINANCE_MANAGER'])]
  },

  // Client space — VIEWER, CLIENT
  {
    path: 'client-space',
    component: ClientSpaceComponent,
    canActivate: [authGuard, roleGuard(['VIEWER', 'CLIENT'])]
  },

  // Users management — ADMIN only
  {
    path: 'users',
    component: UsersComponent,
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  },

  // Clients management — ADMIN, OPERATOR, SPECTRUM_MANAGER, FINANCE_MANAGER
  {
    path: 'clients',
    component: ClientsComponent,
    canActivate: [authGuard, roleGuard(['ADMIN', 'OPERATOR', 'SPECTRUM_MANAGER', 'FINANCE_MANAGER'])]
  },

  // Authorizations — ADMIN, OPERATOR, SPECTRUM_MANAGER
  {
    path: 'authorizations',
    component: AuthorizationsComponent,
    canActivate: [authGuard, roleGuard(['ADMIN', 'OPERATOR', 'SPECTRUM_MANAGER'])]
  },

  // Invoices — ADMIN, FINANCE_MANAGER
  {
    path: 'invoices',
    component: InvoicesComponent,
    canActivate: [authGuard, roleGuard(['ADMIN', 'FINANCE_MANAGER'])]
  },

  // Tarification & Calcul Automatique (Cost) — ADMIN, FINANCE_MANAGER, SPECTRUM_MANAGER
  {
    path: 'cost',
    component: CostComponent,
    canActivate: [authGuard, roleGuard(['ADMIN', 'FINANCE_MANAGER', 'SPECTRUM_MANAGER'])]
  },

  // Forecasting — ADMIN, SPECTRUM_MANAGER
  {
    path: 'forecasting',
    component: ForecastingComponent,
    canActivate: [authGuard, roleGuard(['ADMIN', 'SPECTRUM_MANAGER'])]
  },

  // Reports — internal staff only
  {
    path: 'reports',
    component: ReportsComponent,
    canActivate: [authGuard, roleGuard(['ADMIN', 'OPERATOR', 'SPECTRUM_MANAGER', 'FINANCE_MANAGER'])]
  },

  { path: '**', redirectTo: '/login' }
];
