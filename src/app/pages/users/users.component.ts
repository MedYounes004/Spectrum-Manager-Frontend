import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, CreateUserPayload } from '../../services/user.service';
import { User } from '../../services/auth.service';

type UserRole = User['role'];
type UserStatus = User['status'];

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent implements OnInit {

  users: User[] = [];
  filteredUsers: User[] = [];
  isLoading = true;
  loadError = '';

  // Search & filter
  searchTerm = '';
  selectedRole: string = '';

  // Modal state
  showModal = false;
  isSubmitting = false;
  submitError = '';
  submitSuccess = '';

  // New user form
  newUser: CreateUserPayload = this.emptyForm();

  readonly roles: UserRole[] = ['ADMIN', 'OPERATOR', 'SPECTRUM_MANAGER', 'FINANCE_MANAGER', 'VIEWER', 'CLIENT'];
  readonly statuses: UserStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

  readonly roleBadgeClass: Record<string, string> = {
    ADMIN: 'badge-admin',
    OPERATOR: 'badge-operator',
    SPECTRUM_MANAGER: 'badge-spectrum',
    FINANCE_MANAGER: 'badge-finance',
    VIEWER: 'badge-viewer',
    CLIENT: 'badge-client'
  };

  readonly roleLabels: Record<string, string> = {
    ADMIN: 'Administrateur',
    OPERATOR: 'Opérateur',
    SPECTRUM_MANAGER: 'Gest. Spectre',
    FINANCE_MANAGER: 'Gest. Finance',
    VIEWER: 'Observateur',
    CLIENT: 'Client Portail'
  };

  readonly statusLabels: Record<string, string> = {
    ACTIVE: 'Actif',
    INACTIVE: 'Inactif',
    SUSPENDED: 'Suspendu'
  };

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.loadError = '';
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        this.loadError = err.status === 0
          ? 'Impossible de joindre le serveur. Vérifiez que le backend est démarré.'
          : `Erreur ${err.status}: ${err.error?.message ?? 'Chargement échoué.'}`;
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(u => {
      const matchesSearch = !term ||
        u.username.toLowerCase().includes(term) ||
        u.firstName.toLowerCase().includes(term) ||
        u.lastName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term);
      const matchesRole = !this.selectedRole || u.role === this.selectedRole;
      return matchesSearch && matchesRole;
    });
  }

  openModal(): void {
    this.newUser = this.emptyForm();
    this.submitError = '';
    this.submitSuccess = '';
    this.showModal = true;
  }

  closeModal(): void {
    if (!this.isSubmitting) {
      this.showModal = false;
    }
  }

  onSubmit(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (!this.newUser.username || !this.newUser.email || !this.newUser.password ||
        !this.newUser.firstName || !this.newUser.lastName || !this.newUser.role) {
      this.submitError = 'Veuillez remplir tous les champs obligatoires (*).';
      return;
    }

    this.isSubmitting = true;
    this.userService.createUser(this.newUser).subscribe({
      next: (created) => {
        this.users.unshift(created);
        this.applyFilters();
        this.isSubmitting = false;
        this.submitSuccess = `Utilisateur "${created.username}" créé avec succès !`;
        setTimeout(() => this.closeModal(), 1500);
      },
      error: (err) => {
        this.isSubmitting = false;
        if (err.status === 0) {
          this.submitError = 'Impossible de joindre le serveur.';
        } else if (err.status === 409 || err.status === 400) {
          this.submitError = err.error?.message ?? 'Le nom d\'utilisateur ou l\'email est déjà utilisé.';
        } else {
          this.submitError = err.error?.message ?? 'Erreur lors de la création.';
        }
      }
    });
  }

  toggleStatus(user: User): void {
    const newStatus: UserStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.userService.updateStatus(user.id, newStatus).subscribe({
      next: (updated) => {
        const idx = this.users.findIndex(u => u.id === updated.id);
        if (idx !== -1) {
          this.users[idx] = updated;
          this.applyFilters();
        }
      },
      error: () => { /* fail silently, status unchanged */ }
    });
  }

  private emptyForm(): CreateUserPayload {
    return {
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'VIEWER',
      status: 'ACTIVE',
      phoneNumber: '',
      company: '',
      address: ''
    };
  }
}
