import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from './auth.service';

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: User['role'];
  status: User['status'];
  phoneNumber?: string;
  company?: string;
  address?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_BASE = '/api/users';

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.API_BASE);
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.API_BASE}/${id}`);
  }

  createUser(payload: CreateUserPayload): Observable<User> {
    return this.http.post<User>(this.API_BASE, payload);
  }

  updateUser(id: number, payload: Partial<CreateUserPayload>): Observable<User> {
    return this.http.put<User>(`${this.API_BASE}/${id}`, payload);
  }

  updateStatus(id: number, status: User['status']): Observable<User> {
    return this.http.patch<User>(`${this.API_BASE}/${id}/status?status=${status}`, {});
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/${id}`);
  }

  existsByUsername(username: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.API_BASE}/exists/username/${username}`);
  }

  existsByEmail(email: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.API_BASE}/exists/email/${email}`);
  }
}
