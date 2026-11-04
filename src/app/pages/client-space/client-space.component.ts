import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { ClientDashboardService, ClientDashboardStats, ClientAutorisation, ClientFacture } from '../../services/client-dashboard.service';
import { Client, ClientService } from '../../services/client.service';

@Component({
  selector: 'app-client-space',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-space.component.html',
  styleUrl: './client-space.component.css'
})
export class ClientSpaceComponent implements OnInit {

  currentUser: User | null = null;
  clientInfo: Client | null = null;
  stats: ClientDashboardStats = {
    totalAutorisations: 0,
    autorisationsActives: 0,
    totalFactures: 0,
    totalMontantPaye: 0
  };

  autorisations: ClientAutorisation[] = [];
  filteredAutorisations: ClientAutorisation[] = [];

  factures: ClientFacture[] = [];
  filteredFactures: ClientFacture[] = [];

  isLoading = true;
  errorMsg = '';
  activeTab: 'autorisations' | 'factures' | 'profil' = 'autorisations';

  // Filters
  searchAutorisation = '';
  filterAutorisationStatus = '';

  searchFacture = '';
  filterFactureStatus = '';

  // Demo / fallback mode if no linked client ID or for ADMIN preview
  isDemoMode = false;

  readonly statusAutorisationBadgeClass: Record<string, string> = {
    ACTIVE: 'badge-active',
    EN_ATTENTE: 'badge-warning',
    EXPIREE: 'badge-danger',
    SUSPENDUE: 'badge-inactive'
  };

  readonly statusAutorisationLabels: Record<string, string> = {
    ACTIVE: 'Active',
    EN_ATTENTE: 'En attente',
    EXPIREE: 'Expirée',
    SUSPENDUE: 'Suspendue'
  };

  readonly statusFactureBadgeClass: Record<string, string> = {
    PAYEE: 'badge-active',
    EN_ATTENTE: 'badge-warning',
    RETARD: 'badge-danger',
    ANNULEE: 'badge-inactive'
  };

  readonly statusFactureLabels: Record<string, string> = {
    PAYEE: 'Payée',
    EN_ATTENTE: 'En attente de paiement',
    RETARD: 'En retard',
    ANNULEE: 'Annulée'
  };

  constructor(
    private authService: AuthService,
    private clientDashboardService: ClientDashboardService,
    private clientService: ClientService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      this.loadClientDashboardData(this.currentUser.id);
    } else {
      this.isLoading = false;
      this.errorMsg = 'Utilisateur non connecté.';
    }
  }

  loadClientDashboardData(userId: number): void {
    this.isLoading = true;
    this.errorMsg = '';

    // Attempt to load client info from dashboard service
    this.clientDashboardService.getClientInfo(userId).subscribe({
      next: (client) => {
        this.clientInfo = client;
        this.fetchDashboardDetails(userId);
      },
      error: (err) => {
        // Fallback: search by client email or load client list if user is ADMIN / testing
        this.clientService.getAllClients().subscribe({
          next: (clients) => {
            const found = clients.find(c => c.userId === userId || c.email === this.currentUser?.email);
            if (found && found.id) {
              this.clientInfo = found;
              this.fetchDashboardDetails(userId);
            } else {
              // Load demo / sample data for demonstration if user has no assigned client yet
              this.loadDemoData();
            }
          },
          error: () => this.loadDemoData()
        });
      }
    });
  }

  fetchDashboardDetails(userId: number): void {
    // 1. Fetch Stats
    this.clientDashboardService.getClientStats(userId).subscribe({
      next: (stats) => { this.stats = stats; },
      error: () => {}
    });

    // 2. Fetch Autorisations
    this.clientDashboardService.getClientAutorisations(userId).subscribe({
      next: (autors) => {
        this.autorisations = autors || [];
        this.applyAutorisationsFilter();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });

    // 3. Fetch Factures
    this.clientDashboardService.getClientFactures(userId).subscribe({
      next: (facts) => {
        this.factures = facts || [];
        this.applyFacturesFilter();
      },
      error: () => {}
    });
  }

  readonly serviceLogos: Record<string, string> = {
    MOBILE_TERRESTRE: 'assets/logos/mobile.png',
    RADIODIFFUSION: 'assets/logos/radio.png',
    AMATEUR: 'assets/logos/amateur.png',
    MOBILE_AERONAUTIQUE: 'assets/logos/aeronautique.png',
    MARITIME: 'assets/logos/maritime.png',
    FIXE: 'assets/logos/fixe.png',
    SATELLITE: 'assets/logos/satellite.png',
    DEFAULT: 'assets/logos/satellite.png'
  };

  getLogoUrl(typeService: string | undefined): string {
    if (!typeService) return this.serviceLogos['DEFAULT'];
    const lower = typeService.toLowerCase();
    if (lower.includes('mobile') && !lower.includes('aéronautique')) return this.serviceLogos['MOBILE_TERRESTRE'];
    if (lower.includes('fixe') || lower.includes('fh') || lower.includes('faisceaux')) return this.serviceLogos['FIXE'];
    if (lower.includes('maritime') || lower.includes('portuaire')) return this.serviceLogos['MARITIME'];
    if (lower.includes('aéronautique') || lower.includes('aero')) return this.serviceLogos['MOBILE_AERONAUTIQUE'];
    if (lower.includes('sat') || lower.includes('vsat')) return this.serviceLogos['SATELLITE'];
    if (lower.includes('amateur')) return this.serviceLogos['AMATEUR'];
    if (lower.includes('radio') || lower.includes('tv') || lower.includes('fm')) return this.serviceLogos['RADIODIFFUSION'];
    return this.serviceLogos['DEFAULT'];
  }

  loadDemoData(): void {
    this.isDemoMode = true;
    this.clientInfo = {
      id: 101,
      codeClient: 'CLT-2026-0042',
      userId: this.currentUser?.id,
      nom: this.currentUser?.lastName || 'Titulaires',
      prenom: this.currentUser?.firstName || 'Espace Client',
      email: this.currentUser?.email || 'client@telecom.tn',
      telephone: '+216 71 888 999',
      adresse: 'Zone Industrielle les Pins, Rue 8600',
      ville: 'Tunis',
      codePostal: '1080',
      pays: 'Tunisie',
      type: 'ENTREPRISE',
      statut: 'ACTIF',
      secteurActivite: 'Télécommunications / Réseau Radio',
      numeroFiscal: '1489201/A/M/000',
      matricule: 'B241092024',
      notes: 'Client titulaire d\'autorisations fréquences bandes GSM/5G et liaison FH.'
    };

    this.stats = {
      totalAutorisations: 4,
      autorisationsActives: 3,
      totalFactures: 5,
      totalMontantPaye: 145800.00
    };

    this.autorisations = [
      {
        id: 1,
        numeroAutorisation: 'AUT-2026-9041',
        reference: 'REF-FH-TUNIS-01',
        typeService: 'Liaison Faisceaux Hertziens (FH)',
        frequenceAssignee: '7.125 GHz - 7.425 GHz',
        bandeFrequence: '7 GHz',
        statut: 'ACTIVE',
        dateEmission: '2026-01-15',
        dateExpiration: '2027-01-14',
        description: 'Liaison Backbone Centre Tunis - Ariana'
      },
      {
        id: 2,
        numeroAutorisation: 'AUT-2026-8812',
        reference: 'REF-5G-PMR-02',
        typeService: 'Réseau Privé Professionnel (PMR/5G)',
        frequenceAssignee: '3.500 GHz - 3.600 GHz',
        bandeFrequence: '3.5 GHz (N78)',
        statut: 'ACTIVE',
        dateEmission: '2025-11-01',
        dateExpiration: '2026-10-31',
        description: 'Bande d\'expérimentation 5G Industrielle'
      },
      {
        id: 3,
        numeroAutorisation: 'AUT-2026-7510',
        reference: 'REF-SAT-VSAT-08',
        typeService: 'Station Terrienne VSAT',
        frequenceAssignee: '14.0 GHz / 11.7 GHz',
        bandeFrequence: 'Bande Ku',
        statut: 'ACTIVE',
        dateEmission: '2026-03-10',
        dateExpiration: '2027-03-09',
        description: 'Station de secours secours maritime'
      },
      {
        id: 4,
        numeroAutorisation: 'AUT-2024-3109',
        reference: 'REF-VHF-MAR-05',
        typeService: 'Bande Maritime VHF',
        frequenceAssignee: '156.800 MHz (Canal 16)',
        bandeFrequence: 'VHF Maritime',
        statut: 'EXPIREE',
        dateEmission: '2024-02-01',
        dateExpiration: '2025-01-31',
        description: 'Ancienne concession radio portuaire'
      }
    ];

    this.factures = [
      {
        id: 501,
        numeroFacture: 'FAC-2026-0098',
        referenceFacture: 'RED-2026-Q1',
        montant: 48500.00,
        statut: 'PAYEE',
        dateEmission: '2026-01-20',
        dateEcheance: '2026-02-20',
        periodeRef: '1er Trimestre 2026',
        typeRedevance: 'Redevance d\'usage de spectre (FH)'
      },
      {
        id: 502,
        numeroFacture: 'FAC-2026-0144',
        referenceFacture: 'RED-2026-Q2',
        montant: 52300.00,
        statut: 'PAYEE',
        dateEmission: '2026-04-05',
        dateEcheance: '2026-05-05',
        periodeRef: '2ème Trimestre 2026',
        typeRedevance: 'Redevance d\'usage de spectre (FH + 5G)'
      },
      {
        id: 503,
        numeroFacture: 'FAC-2026-0210',
        referenceFacture: 'RED-2026-Q3',
        montant: 45000.00,
        statut: 'PAYEE',
        dateEmission: '2026-07-01',
        dateEcheance: '2026-08-01',
        periodeRef: '3ème Trimestre 2026',
        typeRedevance: 'Redevance trimestrielle fréquences'
      },
      {
        id: 504,
        numeroFacture: 'FAC-2026-0305',
        referenceFacture: 'RED-2026-Q4',
        montant: 47200.00,
        statut: 'EN_ATTENTE',
        dateEmission: '2026-08-01',
        dateEcheance: '2026-09-01',
        periodeRef: '4ème Trimestre 2026',
        typeRedevance: 'Redevance d\'attribution et gestion'
      }
    ];

    this.applyAutorisationsFilter();
    this.applyFacturesFilter();
    this.isLoading = false;
  }

  applyAutorisationsFilter(): void {
    const term = this.searchAutorisation.toLowerCase().trim();
    this.filteredAutorisations = this.autorisations.filter(a => {
      const matchSearch = !term ||
        (a.numeroAutorisation && a.numeroAutorisation.toLowerCase().includes(term)) ||
        (a.reference && a.reference.toLowerCase().includes(term)) ||
        (a.typeService && a.typeService.toLowerCase().includes(term)) ||
        (a.frequenceAssignee && a.frequenceAssignee.toLowerCase().includes(term));
      const matchStatus = !this.filterAutorisationStatus || a.statut === this.filterAutorisationStatus;
      return matchSearch && matchStatus;
    });
  }

  applyFacturesFilter(): void {
    const term = this.searchFacture.toLowerCase().trim();
    this.filteredFactures = this.factures.filter(f => {
      const matchSearch = !term ||
        (f.numeroFacture && f.numeroFacture.toLowerCase().includes(term)) ||
        (f.referenceFacture && f.referenceFacture.toLowerCase().includes(term)) ||
        (f.typeRedevance && f.typeRedevance.toLowerCase().includes(term)) ||
        (f.periodeRef && f.periodeRef.toLowerCase().includes(term));
      const matchStatus = !this.filterFactureStatus || f.statut === this.filterFactureStatus;
      return matchSearch && matchStatus;
    });
  }

  getInitials(): string {
    if (!this.clientInfo) return 'CL';
    const n = this.clientInfo.nom?.charAt(0) ?? '';
    const p = this.clientInfo.prenom?.charAt(0) ?? '';
    return (n + p).toUpperCase() || 'CL';
  }
}
