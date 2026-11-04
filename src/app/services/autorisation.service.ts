import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Client } from './client.service';

export type TypeAutorisation =
  | 'MOBILE_TERRESTRE'
  | 'RADIODIFFUSION'
  | 'AMATEUR'
  | 'MOBILE_AERONAUTIQUE'
  | 'MARITIME'
  | 'FIXE'
  | 'SATELLITE';

export type StatutAutorisation =
  | 'EN_ATTENTE'
  | 'ACTIVE'
  | 'SUSPENDUE'
  | 'EXPIREE';

export interface Autorisation {
  id?: number;
  numeroAutorisation?: string;
  clientId: number;
  client?: Client;
  service: TypeAutorisation;
  type?: TypeAutorisation; // Alias for backward compatibility
  statut: StatutAutorisation;
  dateDebut: string;
  dateFin?: string;

  // ===== CHAMPS COMMUNS À TOUS LES SERVICES =====
  typeEquipement?: string;
  marqueEquipement?: string;
  modeleEquipement?: string;
  nombreAppareils?: number;

  // ===== SERVICE MOBILE TERRESTRE =====
  frequenceCentrale?: number;           // Fréquence centrale [MHz]
  largeurCanal?: number;                // Largeur de canal [MHz]
  puissanceRayonnee?: number;           // Puissance rayonnée [W]
  gainAntenne?: number;                 // Gain d'antenne [dBi]
  typeAntenne?: string;                 // Type d'antenne
  marqueAntenne?: string;               // Marque d'antenne
  diagrammeAntenne?: string;            // Diagramme d'antenne (fichier)
  technologie?: string;                 // 2G, 3G, 4G, 5G, 6G (liste déroulante)
  nombreEmetteurs?: number;            // Nombre d'émetteurs
  positionGPS?: string;                 // Position GPS du site
  zoneService?: string;                 // Zone de service
  hauteurAntenneSol?: number;           // Hauteur d'antenne par rapport au sol [m]

  // ===== SERVICE RADIODIFFUSION (TV, radio) =====
  frequenceRadio?: number;              // Fréquence [MHz]
  frequenceImage?: number;              // Fréquence Image [MHz]
  puissanceRadio?: number;              // Puissance rayonnée [W]
  bandeFrequences?: string;             // Bande de fréquences
  typeAntenneRadio?: string;            // Type d'antenne
  marqueAntenneRadio?: string;          // Marque d'antenne
  localisationZone?: string;            // Localisation ou zone de service
  normeDiffusion?: string;              // Norme de diffusion (liste déroulante)
  largeurCanalRadio?: number;           // Largeur de canal [MHz]

  // ===== SERVICE FIXE =====
  frequenceEmission?: number;           // Fréquence émission [MHz]
  frequenceReception?: number;          // Fréquence réception [MHz]
  largeurCanalFixe?: number;            // Largeur de canal [MHz]
  diversite?: string;                   // 1+1, 1+0, 2+0, 2+1 (liste déroulante)
  coordonneesGPSEmetteur?: string;      // Coordonnée GPS de l'émetteur
  coordonneesGPSRecepteur?: string;     // Coordonnée GPS du récepteur
  zoneServiceFixe?: string;             // Zone de service
  arrangementCanaux?: string;           // Arrangement de canaux (recommandation ITU)
  diametreAntenneFixe?: number;         // Diamètre antenne [m]
  typeModulation?: string;              // Type de modulation

  // ===== SERVICE SATELLITE =====
  nomSatellite?: string;                // Nom du satellite
  typeSatellite?: string;               // GEO / non-GEO
  positionGPSStation?: string;          // Position GPS de la station terrienne
  debit?: number;                       // Débit [Mbit/s]
  modulation?: string;                  // Modulation
  positionOrbitale?: string;            // Position orbitale
  typeStation?: string;                 // Type de station
  gainAntenneSatellite?: number;        // Gain antenne [dBi]
  diametreAntenneSat?: number;          // Diamètre antenne [m]
  bandeFreqSat?: string;                // Bande de fréquences

  // ===== SERVICE MARITIME =====
  typeNavire?: string;                  // Type de navire
  numMMSI?: string;                     // Numéro MMSI
  indicatifAppel?: string;              // Indicatif d'appel
  frequenceMaritime?: number;           // Fréquence [MHz]
  puissanceMaritime?: number;           // Puissance [W]
  zoneNavigation?: string;              // Zone de navigation
  equipementRadio?: string;             // Équipement radio
  typeAntenneMaritime?: string;         // Type d'antenne
  positionGPSMaritime?: string;         // Position GPS

  // ===== SERVICE AÉRONAUTIQUE =====
  typeAeronef?: string;                 // Type d'aéronef
  immatriculation?: string;             // Immatriculation
  frequenceAero?: number;               // Fréquence [MHz]
  puissanceAero?: number;               // Puissance [W]
  modeCommunication?: string;           // Mode de communication (AM, FM, Data)
  zoneOperation?: string;               // Zone d'opération
  typeAntenneAero?: string;             // Type d'antenne
  positionGPSAero?: string;             // Position GPS

  // ===== SERVICE AMATEUR =====
  classeAmateur?: string;               // Classe (A, B, C)
  indicatif?: string;                   // Indicatif
  frequenceAmateur?: number;            // Fréquence [MHz]
  puissanceAmateur?: number;            // Puissance [W]
  modeEmission?: string;                // Mode d'émission (CW, SSB, FM, Digital)
  antenneType?: string;                 // Type d'antenne
  marqueAntenneAmateur?: string;        // Marque d'antenne
  gainAntenneAmateur?: number;          // Gain d'antenne [dBi]
  positionGPSAmateur?: string;          // Position GPS

  // ===== CONDITIONS =====
  conditions?: string;
  observations?: string;

  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface AutorisationStats {
  total: number;
  parService?: Record<string, number>;
  parType?: Record<string, number>;
  parStatut?: Record<string, number>;
  actives?: number;
  en_attente?: number;
  expirees?: number;
  suspendues?: number;
}

export const TYPE_AUTORISATION_LABELS: Record<TypeAutorisation, string> = {
  FIXE: 'Service Fixe (Faisceaux hertziens)',
  MOBILE_TERRESTRE: 'Service Mobile Terrestre',
  RADIODIFFUSION: 'Service Radiodiffusion (TV/Radio)',
  MARITIME: 'Service Maritime',
  MOBILE_AERONAUTIQUE: 'Service Mobile Aéronautique',
  AMATEUR: 'Service Amateur',
  SATELLITE: 'Service Satellite'
};

@Injectable({
  providedIn: 'root'
})
export class AutorisationService {
  private readonly API_BASE = '/api/autorisations';

  constructor(private http: HttpClient) {}

  getAllAutorisations(): Observable<Autorisation[]> {
    return this.http.get<Autorisation[]>(this.API_BASE);
  }

  getAutorisationById(id: number): Observable<Autorisation> {
    return this.http.get<Autorisation>(`${this.API_BASE}/${id}`);
  }

  getAutorisationsByService(service: TypeAutorisation): Observable<Autorisation[]> {
    return this.http.get<Autorisation[]>(`${this.API_BASE}/service/${service}`);
  }

  getAutorisationsByType(type: TypeAutorisation): Observable<Autorisation[]> {
    return this.getAutorisationsByService(type);
  }

  getAutorisationsByStatut(statut: StatutAutorisation): Observable<Autorisation[]> {
    return this.http.get<Autorisation[]>(`${this.API_BASE}/statut/${statut}`);
  }

  getAutorisationsByClient(clientId: number): Observable<Autorisation[]> {
    return this.http.get<Autorisation[]>(`${this.API_BASE}/client/${clientId}`);
  }

  getExpiringSoon(): Observable<Autorisation[]> {
    return this.http.get<Autorisation[]>(`${this.API_BASE}/expiring-soon`);
  }

  createAutorisation(payload: Autorisation): Observable<Autorisation> {
    const body = {
      ...payload,
      service: payload.service || payload.type || 'FIXE'
    };
    return this.http.post<Autorisation>(this.API_BASE, body);
  }

  updateAutorisation(id: number, payload: Partial<Autorisation>): Observable<Autorisation> {
    const body = {
      ...payload,
      service: payload.service || payload.type
    };
    return this.http.put<Autorisation>(`${this.API_BASE}/${id}`, body);
  }

  updateStatut(id: number, statut: StatutAutorisation): Observable<Autorisation> {
    return this.http.patch<Autorisation>(`${this.API_BASE}/${id}/statut?statut=${statut}`, {});
  }

  deleteAutorisation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/${id}`);
  }

  getStats(): Observable<AutorisationStats> {
    return this.http.get<AutorisationStats>(`${this.API_BASE}/stats`);
  }

  search(params: any): Observable<Autorisation[]> {
    return this.http.get<Autorisation[]>(`${this.API_BASE}/search`, { params });
  }

  searchByFrequence(frequence: number): Observable<Autorisation[]> {
    return this.http.get<Autorisation[]>(`${this.API_BASE}/search/by-frequence`, { params: { frequence: frequence.toString() } });
  }

  searchByZone(zone: string): Observable<Autorisation[]> {
    return this.http.get<Autorisation[]>(`${this.API_BASE}/search/by-zone`, { params: { zone } });
  }

  searchByFrequenceAndZone(frequence: number, zone: string): Observable<Autorisation[]> {
    return this.http.get<Autorisation[]>(`${this.API_BASE}/search/by-frequence-and-zone`, { params: { frequence: frequence.toString(), zone } });
  }
}

