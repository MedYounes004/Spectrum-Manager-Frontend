import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username = '';
  password = '';
  showPassword = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private router: Router, private authService: AuthService) {}

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onLogin(event: Event): void {
    event.preventDefault();
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    this.isLoading = true;

    this.authService.login({ username: this.username.trim(), password: this.password }).subscribe({
      next: (user) => {
        this.isLoading = false;
        this.successMessage = `Bienvenue, ${user.firstName} ${user.lastName} !`;
        setTimeout(() => {
          if (user.role === 'VIEWER' || user.role === 'CLIENT') {
            this.router.navigate(['/client-space']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        }, 800);
      },
      error: (err: Error) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Erreur de connexion.';
      }
    });
  }
}
