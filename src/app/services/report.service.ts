import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface BilanAnnuelDTO {
  annee: number;
  totalAutorisations: number;
  autorisationsActives: number;
  autorisationsExpirees: number;
  autorisationsEnAttente: number;
  nouvellesAutorisations: number;
  totalRecettes: number;
  autorisationsParType: { [key: string]: number };
  recettesParType: { [key: string]: number };
  tauxCroissance: number;
}

export interface RapportActiviteDTO {
  dateDebut: string;
  dateFin: string;
  totalDemandes: number;
  demandesApprouvees: number;
  demandesRefusees: number;
  demandesEnAttente: number;
  montantTotal: number;
  montantPercu: number;
  recettesParMois: { [key: string]: number };
  demandesParType: { [key: string]: number };
}

export interface ReportResume {
  annee: number;
  totalAutorisations: number;
  autorisationsActives: number;
  totalRecettes: number;
  tauxCroissance: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private readonly API_BASE = '/api/reports';

  constructor(private http: HttpClient) {}

  getBilanAnnuel(annee: number): Observable<BilanAnnuelDTO> {
    return this.http.get<BilanAnnuelDTO>(`${this.API_BASE}/bilan/${annee}`);
  }

  getBilanAnneeCourante(): Observable<BilanAnnuelDTO> {
    return this.http.get<BilanAnnuelDTO>(`${this.API_BASE}/bilan/courant`);
  }

  getRapportActivite(debut: string, fin: string): Observable<RapportActiviteDTO> {
    return this.http.get<Record<string, unknown>>(`${this.API_BASE}/activite?debut=${debut}&fin=${fin}`).pipe(
      map((data) => ({
        dateDebut: String(data['dateDebut'] ?? debut),
        dateFin: String(data['dateFin'] ?? fin),
        totalDemandes: Number(data['totalDemandes'] ?? 0),
        demandesApprouvees: Number(data['demandesApprouvees'] ?? 0),
        demandesRefusees: Number(data['demandesRefusees'] ?? 0),
        demandesEnAttente: Number(data['demandesEnAttente'] ?? 0),
        montantTotal: Number(data['montantTotal'] ?? 0),
        montantPercu: Number(data['montantPercu'] ?? data['montantPerçu'] ?? 0),
        recettesParMois: (data['recettesParMois'] as Record<string, number>) ?? {},
        demandesParType: (data['demandesParType'] as Record<string, number>) ?? {}
      }))
    );
  }

  getStats(): Observable<any> {
    return this.http.get<any>(`${this.API_BASE}/stats`);
  }

  getResume(): Observable<ReportResume> {
    return this.http.get<ReportResume>(`${this.API_BASE}/resume`);
  }

  getAnnualReport(annee: number): Observable<any> {
    return this.http.get<any>(`${this.API_BASE}/annual/${annee}`);
  }

  getAnnualReportFiltered(annee: number, filters: any): Observable<any> {
    return this.http.get<any>(`${this.API_BASE}/annual/${annee}/filtered`, { params: filters });
  }

  getAnnualSummary(annee: number): Observable<ReportResume> {
    return this.http.get<ReportResume>(`${this.API_BASE}/summary/${annee}`);
  }

  getPrintFactureData(factureId: number): Observable<any> {
    return this.http.get<any>(`${this.API_BASE}/print/facture/${factureId}`);
  }

  getPrintAutorisationData(autorisationId: number): Observable<any> {
    return this.http.get<any>(`${this.API_BASE}/print/autorisation/${autorisationId}`);
  }
}
