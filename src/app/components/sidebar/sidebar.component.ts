import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: string[]; // empty = accessible to all authenticated users
}

const ALL_NAV_ITEMS: NavItem[] = [
  {
    label: 'Tableau de bord',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    route: '/dashboard',
    roles: ['ADMIN', 'OPERATOR', 'SPECTRUM_MANAGER', 'FINANCE_MANAGER']
  },
  {
    label: 'Utilisateurs',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    route: '/users',
    roles: ['ADMIN']
  },
  {
    label: 'Clients',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    route: '/clients',
    roles: ['ADMIN', 'OPERATOR', 'SPECTRUM_MANAGER', 'FINANCE_MANAGER']
  },
  {
    label: 'Autorisations',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 014 10c0 .991.13 1.953.376 2.879.444 1.666 1.157 3.208 2.079 4.549A9 9 0 0012 21a9 9 0 005.545-3.572c.922-1.34 1.635-2.883 2.08-4.55A11.955 11.955 0 0120 10a11.955 11.955 0 01-5.382-2.016z',
    route: '/authorizations',
    roles: ['ADMIN', 'OPERATOR', 'SPECTRUM_MANAGER']
  },
  {
    label: 'Factures & Redevances',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    route: '/invoices',
    roles: ['ADMIN', 'FINANCE_MANAGER']
  },
  {
    label: 'Tarification & Coûts',
    icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    route: '/cost',
    roles: ['ADMIN', 'FINANCE_MANAGER', 'SPECTRUM_MANAGER']
  },
  {
    label: 'Prévisions (IA)',
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    route: '/forecasting',
    roles: ['ADMIN', 'SPECTRUM_MANAGER']
  },
  {
    label: 'Rapports Annuels',
    icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    route: '/reports',
    roles: ['ADMIN', 'OPERATOR', 'SPECTRUM_MANAGER', 'FINANCE_MANAGER']
  },
  {
    label: 'Espace Client',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    route: '/client-space',
    roles: ['CLIENT', 'VIEWER']
  }
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  OPERATOR: 'Opérateur',
  SPECTRUM_MANAGER: 'Gest. Spectre',
  FINANCE_MANAGER: 'Gest. Finance',
  VIEWER: 'Observateur',
  CLIENT: 'Espace Client'
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  currentUser: User | null = null;
  navItems: NavItem[] = [];
  userInitials = 'U';
  userRoleLabel = '';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      const role = this.currentUser.role;
      // Filter nav items by role
      this.navItems = ALL_NAV_ITEMS.filter(item =>
        item.roles.length === 0 || item.roles.includes(role)
      );
      this.userInitials = `${this.currentUser.firstName?.charAt(0) ?? ''}${this.currentUser.lastName?.charAt(0) ?? ''}`.toUpperCase();
      this.userRoleLabel = ROLE_LABELS[role] ?? role;
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
