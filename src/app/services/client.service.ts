import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type TypeClient = 'ENTREPRISE' | 'PERSONNE';
export type StatutClient = 'ACTIF' | 'INACTIF';

export interface Client {
  id?: number;
  codeClient?: string;
  userId?: number;
  nom: string;
  prenom?: string;
  email: string;
  telephone: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  pays?: string;
  type?: TypeClient;
  statut?: StatutClient;
  secteurActivite?: string;
  numeroFiscal?: string;
  matricule?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientStats {
  totalClients: number;
  activeClients: number;
  entreprises: number;
  personnes: number;
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private readonly API_BASE = '/api/clients';

  constructor(private http: HttpClient) {}

  getAllClients(): Observable<Client[]> {
    return this.http.get<Client[]>(this.API_BASE);
  }

  getClientById(id: number): Observable<Client> {
    return this.http.get<Client>(`${this.API_BASE}/${id}`);
  }

  getClientByUserId(userId: number): Observable<Client> {
    return this.http.get<Client>(`${this.API_BASE}/user/${userId}`);
  }

  getClientByCode(codeClient: string): Observable<Client> {
    return this.http.get<Client>(`${this.API_BASE}/code/${codeClient}`);
  }

  getClientByEmail(email: string): Observable<Client> {
    return this.http.get<Client>(`${this.API_BASE}/email/${email}`);
  }

  getClientsByStatut(statut: StatutClient): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.API_BASE}/statut/${statut}`);
  }

  getClientsByType(type: TypeClient): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.API_BASE}/type/${type}`);
  }

  searchClientsByName(nom: string): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.API_BASE}/search?nom=${nom}`);
  }

  createClient(client: Client): Observable<Client> {
    return this.http.post<Client>(this.API_BASE, client);
  }

  updateClient(id: number, client: Partial<Client>): Observable<Client> {
    return this.http.put<Client>(`${this.API_BASE}/${id}`, client);
  }

  updateClientStatus(id: number, statut: StatutClient): Observable<Client> {
    return this.http.patch<Client>(`${this.API_BASE}/${id}/statut?statut=${statut}`, {});
  }

  deleteClient(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/${id}`);
  }

  getStats(): Observable<ClientStats> {
    return this.http.get<ClientStats>(`${this.API_BASE}/stats`);
  }
}
