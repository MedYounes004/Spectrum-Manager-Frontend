import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Autorisation } from './autorisation.service';

export interface FormuleTarifaire {
  id?: number;
  service: string;               // e.g. 'FIXE', 'MOBILE_TERRESTRE', 'RADIODIFFUSION', etc.
  pays?: string;                 // e.g. 'Tunisie', 'France', 'International'
  montantBase?: number;          // Montant forfaitaire de base [TND / EUR]
  coeffPuissance?: number;       // Coeff appliqué à la puissance rayonnée [W]
  coeffFrequence?: number;       // Coeff appliqué à la fréquence [MHz]
  coeffAppareils?: number;       // Coeff appliqué au nombre d'appareils
  coeffLargeurBande?: number;    // Coeff appliqué à la largeur de bande [MHz]
  coeffGainAntenne?: number;     // Coeff appliqué au gain d'antenne [dBi]
  tva?: number;                  // Taux TVA en % (ex: 19)
  actif?: boolean;               // Formule active ou non
  createdAt?: string;
  updatedAt?: string;
}

export interface CalculResult {
  montantBase: number;
  partPuissance: number;
  partFrequence: number;
  partAppareils: number;
  partLargeurBande: number;
  partGainAntenne: number;
  montantHT: number;
  tvaTaux: number;
  montantTVA: number;
  montantTTC: number;
}

export interface TechnicalParams {
  puissance: number;
  frequence: number;
  nbAppareils: number;
  largeurBande?: number;
  gainAntenne?: number;
}

@Injectable({
  providedIn: 'root'
})
export class FormuleTarifaireService {
  private readonly API_BASE = '/api/formules';

  constructor(private http: HttpClient) {}

  getAll(): Observable<FormuleTarifaire[]> {
    return this.http.get<FormuleTarifaire[]>(this.API_BASE);
  }

  getById(id: number): Observable<FormuleTarifaire> {
    return this.http.get<FormuleTarifaire>(`${this.API_BASE}/${id}`);
  }

  getByServiceAndPays(service: string, pays: string): Observable<FormuleTarifaire> {
    return this.http.get<FormuleTarifaire>(`${this.API_BASE}/${encodeURIComponent(service)}/${encodeURIComponent(pays)}`);
  }

  create(formule: FormuleTarifaire): Observable<FormuleTarifaire> {
    return this.http.post<FormuleTarifaire>(this.API_BASE, formule);
  }

  update(id: number, formule: FormuleTarifaire): Observable<FormuleTarifaire> {
    return this.http.put<FormuleTarifaire>(`${this.API_BASE}/${id}`, formule);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/${id}`);
  }

  calculerMontant(
    service: string,
    pays: string,
    puissance: number,
    frequence: number,
    nbAppareils: number
  ): Observable<number> {
    const params = new HttpParams()
      .set('service', service)
      .set('pays', pays)
      .set('puissance', puissance.toString())
      .set('frequence', frequence.toString())
      .set('nbAppareils', nbAppareils.toString());

    return this.http.post<number>(`${this.API_BASE}/calcul`, null, { params });
  }

  /**
   * Calcul détaillé local (pour prévisualisation et affichage du breakdown)
   */
  calculerDetails(
    formule: FormuleTarifaire,
    params: TechnicalParams
  ): CalculResult {
    const base = Number(formule.montantBase || 0);
    const coeffP = Number(formule.coeffPuissance || 0);
    const coeffF = Number(formule.coeffFrequence || 0);
    const coeffA = Number(formule.coeffAppareils || 0);
    const coeffBw = Number(formule.coeffLargeurBande || 0);
    const coeffG = Number(formule.coeffGainAntenne || 0);
    const tva = Number(formule.tva != null ? formule.tva : 19);

    const puissance = Number(params.puissance || 0);
    const frequence = Number(params.frequence || 0);
    const nbAppareils = Number(params.nbAppareils || 1);
    const largeurBande = Number(params.largeurBande || 0);
    const gainAntenne = Number(params.gainAntenne || 0);

    const partPuissance = coeffP * puissance;
    const partFrequence = coeffF * frequence;
    const partAppareils = coeffA * nbAppareils;
    const partLargeurBande = coeffBw * largeurBande;
    const partGainAntenne = coeffG * gainAntenne;

    const montantHT = base + partPuissance + partFrequence + partAppareils + partLargeurBande + partGainAntenne;
    const montantTVA = montantHT * (tva / 100.0);
    const montantTTC = Math.round((montantHT + montantTVA) * 100) / 100;

    return {
      montantBase: base,
      partPuissance: Math.round(partPuissance * 100) / 100,
      partFrequence: Math.round(partFrequence * 100) / 100,
      partAppareils: Math.round(partAppareils * 100) / 100,
      partLargeurBande: Math.round(partLargeurBande * 100) / 100,
      partGainAntenne: Math.round(partGainAntenne * 100) / 100,
      montantHT: Math.round(montantHT * 100) / 100,
      tvaTaux: tva,
      montantTVA: Math.round(montantTVA * 100) / 100,
      montantTTC
    };
  }

  /**
   * Extrait automatiquement les paramètres techniques d'une autorisation selon son service
   */
  extractTechnicalParams(auth: Autorisation): TechnicalParams {
    const service = auth.service || auth.type || 'FIXE';
    let frequence = 0;
    let puissance = 0;
    let nbAppareils = auth.nombreAppareils || 1;
    let largeurBande = 0;
    let gainAntenne = 0;

    switch (service) {
      case 'FIXE':
        frequence = auth.frequenceEmission || auth.frequenceReception || 0;
        largeurBande = auth.largeurCanalFixe || 0;
        break;
      case 'MOBILE_TERRESTRE':
        frequence = auth.frequenceCentrale || 0;
        puissance = auth.puissanceRayonnee || 0;
        largeurBande = auth.largeurCanal || 0;
        gainAntenne = auth.gainAntenne || 0;
        nbAppareils = auth.nombreEmetteurs || auth.nombreAppareils || 1;
        break;
      case 'RADIODIFFUSION':
        frequence = auth.frequenceRadio || auth.frequenceImage || 0;
        puissance = auth.puissanceRadio || 0;
        largeurBande = auth.largeurCanalRadio || 0;
        break;
      case 'MARITIME':
        frequence = auth.frequenceMaritime || 0;
        puissance = auth.puissanceMaritime || 0;
        break;
      case 'MOBILE_AERONAUTIQUE':
        frequence = auth.frequenceAero || 0;
        puissance = auth.puissanceAero || 0;
        break;
      case 'AMATEUR':
        frequence = auth.frequenceAmateur || 0;
        puissance = auth.puissanceAmateur || 0;
        gainAntenne = auth.gainAntenneAmateur || 0;
        break;
      case 'SATELLITE':
        gainAntenne = auth.gainAntenneSatellite || 0;
        break;
      default:
        frequence = auth.frequenceCentrale || auth.frequenceEmission || auth.frequenceRadio || 0;
        break;
    }

    return {
      puissance,
      frequence,
      nbAppareils: nbAppareils > 0 ? nbAppareils : 1,
      largeurBande,
      gainAntenne
    };
  }
}
