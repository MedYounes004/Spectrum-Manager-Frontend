import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'OPERATOR' | 'SPECTRUM_MANAGER' | 'FINANCE_MANAGER' | 'VIEWER' | 'CLIENT';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  phoneNumber?: string;
  company?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // Uses relative path so Angular dev‑server proxy forwards to Gateway :8083
  // In production, replace with the absolute gateway URL.
  private readonly API_BASE = '/api/users';
  private readonly CURRENT_USER_KEY = 'sfmSpectre_currentUser';

  constructor(private http: HttpClient, private router: Router) {}

  /**
   * Authenticates a user by fetching their profile from the backend
   * via the gateway and comparing the provided password.
   */
  login(credentials: LoginCredentials): Observable<User> {
    return this.http
      .get<User>(`${this.API_BASE}/username/${credentials.username}`)
      .pipe(
        map((user: User) => {
          // Compare provided password with stored password
          if (user.password !== credentials.password) {
            throw new Error('INVALID_PASSWORD');
          }
          if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
            throw new Error('ACCOUNT_DISABLED');
          }
          // Persist user session in localStorage
          const safeUser = { ...user, password: '' }; // Don't store password
          localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(safeUser));
          return user;
        }),
        catchError((err) => {
          if (err.message === 'INVALID_PASSWORD') {
            return throwError(() => new Error('Mot de passe incorrect.'));
          }
          if (err.message === 'ACCOUNT_DISABLED') {
            return throwError(() => new Error('Ce compte est désactivé ou suspendu.'));
          }
          if (err.status === 404) {
            return throwError(() => new Error('Utilisateur introuvable.'));
          }
          if (err.status === 0) {
            return throwError(() => new Error('Impossible de joindre le serveur. Vérifiez que le backend est démarré.'));
          }
          return throwError(() => new Error(err.error?.message || 'Erreur lors de la connexion.'));
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.CURRENT_USER_KEY);
    this.router.navigate(['/login']);
  }

  getCurrentUser(): User | null {
    const userJson = localStorage.getItem(this.CURRENT_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getCurrentUser();
  }
}
