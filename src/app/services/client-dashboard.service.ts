import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Client } from './client.service';

export interface ClientDashboardStats {
  client?: {
    id: number;
    nom: string;
    prenom?: string;
    codeClient: string;
  };
  totalAutorisations: number;
  totalFactures: number;
  autorisationsActives: number;
  totalMontantPaye: number;
}

export interface ClientAutorisation {
  id: number;
  numeroAutorisation?: string;
  reference?: string;
  typeService?: string;
  frequenceAssignee?: string;
  bandeFrequence?: string;
  statut: string;
  dateEmission?: string;
  dateExpiration?: string;
  dateDebut?: string;
  dateFin?: string;
  description?: string;
}

export interface ClientFacture {
  id: number;
  numeroFacture?: string;
  referenceFacture?: string;
  montant: number;
  statut: string; // PAYEE, EN_ATTENTE, RETARD, ANNULEE
  dateEmission?: string;
  dateEcheance?: string;
  periodeRef?: string;
  typeRedevance?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientDashboardService {
  private readonly API_BASE = '/api/client/dashboard';

  constructor(private http: HttpClient) {}

  getClientInfo(userId: number): Observable<Client> {
    return this.http.get<Client>(`${this.API_BASE}/info/${userId}`);
  }

  getClientAutorisations(userId: number): Observable<ClientAutorisation[]> {
    return this.http.get<ClientAutorisation[]>(`${this.API_BASE}/autorisations/${userId}`);
  }

  getClientFactures(userId: number): Observable<ClientFacture[]> {
    return this.http.get<ClientFacture[]>(`${this.API_BASE}/factures/${userId}`);
  }

  getClientStats(userId: number): Observable<ClientDashboardStats> {
    return this.http.get<ClientDashboardStats>(`${this.API_BASE}/stats/${userId}`);
  }
}
