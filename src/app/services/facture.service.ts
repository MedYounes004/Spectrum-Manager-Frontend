import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Client } from './client.service';

export type StatutFacture =
  | 'EN_ATTENTE'
  | 'PAYEE'
  | 'EN_RETARD'
  | 'ANNULEE'
  | 'EN_COURS';

export type TypeOperationFacture =
  | 'REDEVANCE'
  | 'AMENDE'
  | 'RENOUVELLEMENT'
  | 'PENALITE'
  | 'AUTRE';

export type TypeFacture =
  | 'INDIVIDUELLE'
  | 'COLLECTIVE'
  | 'AVOIR';

export interface Facture {
  id?: number;
  numeroFacture?: string;
  clientId: number;
  client?: Client;
  autorisationId?: number;
  autorisationIds?: number[];
  typeAutorisation?: string;
  typeFacture?: TypeFacture;
  description?: string;
  montant: number;
  dateEmission: string;
  dateEcheance: string;
  datePaiement?: string;
  statut: StatutFacture;
  type?: TypeOperationFacture;
  modePaiement?: string;
  referencePaiement?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FactureStats {
  total: number;
  totalMontantPaye?: number;
  parStatut?: Record<string, number>;
  parTypeFacture?: Record<string, number>;
  parTypeAutorisation?: Record<string, number>;
  payees?: number;
  en_attente?: number;
  en_retard?: number;
  total_montant?: number;
}

export const TYPE_OPERATION_LABELS: Record<TypeOperationFacture, string> = {
  REDEVANCE: 'Redevance',
  AMENDE: 'Amende',
  RENOUVELLEMENT: 'Renouvellement',
  PENALITE: 'Pénalité',
  AUTRE: 'Autre'
};

export const TYPE_FACTURE_LABELS: Record<TypeFacture, string> = {
  INDIVIDUELLE: 'Facture Individuelle',
  COLLECTIVE: 'Facture Collective',
  AVOIR: 'Facture Avoir'
};

export const STATUT_FACTURE_LABELS: Record<StatutFacture, string> = {
  EN_ATTENTE: 'En attente',
  PAYEE: 'Payée',
  EN_RETARD: 'En retard',
  ANNULEE: 'Annulée',
  EN_COURS: 'En cours'
};

@Injectable({
  providedIn: 'root'
})
export class FactureService {
  private readonly API_BASE = '/api/factures';

  constructor(private http: HttpClient) {}

  getAllFactures(): Observable<Facture[]> {
    return this.http.get<Facture[]>(this.API_BASE);
  }

  getFactureById(id: number): Observable<Facture> {
    return this.http.get<Facture>(`${this.API_BASE}/${id}`);
  }

  getFactureByNumero(numero: string): Observable<Facture> {
    return this.http.get<Facture>(`${this.API_BASE}/numero/${numero}`);
  }

  getFacturesByStatut(statut: StatutFacture): Observable<Facture[]> {
    return this.http.get<Facture[]>(`${this.API_BASE}/statut/${statut}`);
  }

  getFacturesByClient(clientId: number): Observable<Facture[]> {
    return this.http.get<Facture[]>(`${this.API_BASE}/client/${clientId}`);
  }

  getFacturesByTypeFacture(typeFacture: TypeFacture): Observable<Facture[]> {
    return this.http.get<Facture[]>(`${this.API_BASE}/type-facture/${typeFacture}`);
  }

  getFacturesByTypeAutorisation(typeAutorisation: string): Observable<Facture[]> {
    return this.http.get<Facture[]>(`${this.API_BASE}/type-autorisation/${typeAutorisation}`);
  }

  getFacturesEnRetard(): Observable<Facture[]> {
    return this.http.get<Facture[]>(`${this.API_BASE}/en-retard`);
  }

  createFacture(payload: Facture): Observable<Facture> {
    return this.http.post<Facture>(this.API_BASE, payload);
  }

  updateFacture(id: number, payload: Partial<Facture>): Observable<Facture> {
    return this.http.put<Facture>(`${this.API_BASE}/${id}`, payload);
  }

  marquerPayee(id: number): Observable<Facture> {
    return this.http.patch<Facture>(`${this.API_BASE}/${id}/paiement`, {});
  }

  deleteFacture(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/${id}`);
  }

  getStats(): Observable<FactureStats> {
    return this.http.get<FactureStats>(`${this.API_BASE}/stats`);
  }

  getStatsByTypeFacture(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.API_BASE}/stats/type-facture`);
  }

  getStatsByTypeAutorisation(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.API_BASE}/stats/type-autorisation`);
  }

  getStatsByStatut(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.API_BASE}/stats/statut`);
  }

  createFactureCollective(clientId: number, autorisationIds: number[], description: string, dateEmission: string, dateEcheance: string): Observable<Facture> {
    const params = {
      clientId: clientId.toString(),
      autorisationIds: autorisationIds.join(','),
      description,
      dateEmission,
      dateEcheance
    };
    return this.http.post<Facture>(`${this.API_BASE}/collective`, null, { params });
  }

  createFactureAvoir(factureId: number, motif: string): Observable<Facture> {
    const params = {
      factureId: factureId.toString(),
      motif
    };
    return this.http.post<Facture>(`${this.API_BASE}/avoir`, null, { params });
  }
}
