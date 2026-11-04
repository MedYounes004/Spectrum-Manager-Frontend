import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AutorisationService,
  Autorisation,
  TypeAutorisation,
  StatutAutorisation,
  AutorisationStats,
  TYPE_AUTORISATION_LABELS
} from '../../services/autorisation.service';
import { ClientService, Client } from '../../services/client.service';

@Component({
  selector: 'app-authorizations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './authorizations.component.html',
  styleUrl: './authorizations.component.css'
})
export class AuthorizationsComponent implements OnInit {
  authorizations: Autorisation[] = [];
  filteredAuthorizations: Autorisation[] = [];
  clients: Client[] = [];
  clientsMap = new Map<number, Client>();
  stats: AutorisationStats = { total: 0, actives: 0, en_attente: 0, expirees: 0, suspendues: 0 };
  isLoading = true;
  errorMsg = '';

  viewMode: 'kanban' | 'table' = 'kanban';
  searchTerm = '';
  selectedZone: string = '';
  selectedFrequence: string = '';
  selectedService: string = '';
  selectedStatut: string = '';
  selectedClientId: string = '';

  showAddModal = false;
  showDetailsModal = false;
  currentStep: 1 | 2 = 1;
  isSubmitting = false;
  submitError = '';
  submitSuccess = '';

  newAuth: Autorisation = this.emptyForm();
  selectedAuth: Autorisation | null = null;
  detailStep: 1 | 2 = 1;

  readonly services: TypeAutorisation[] = [
    'FIXE',
    'MOBILE_TERRESTRE',
    'RADIODIFFUSION',
    'MARITIME',
    'MOBILE_AERONAUTIQUE',
    'AMATEUR',
    'SATELLITE'
  ];

  readonly statuts: StatutAutorisation[] = [
    'EN_ATTENTE',
    'ACTIVE',
    'SUSPENDUE',
    'EXPIREE'
  ];

  readonly serviceLabels = TYPE_AUTORISATION_LABELS;

  readonly serviceLogos: Record<TypeAutorisation, string> = {
    MOBILE_TERRESTRE: 'assets/logos/mobile.png',
    RADIODIFFUSION: 'assets/logos/radio.png',
    AMATEUR: 'assets/logos/amateur.png',
    MOBILE_AERONAUTIQUE: 'assets/logos/aeronautique.png',
    MARITIME: 'assets/logos/maritime.png',
    FIXE: 'assets/logos/fixe.png',
    SATELLITE: 'assets/logos/satellite.png'
  };

  readonly serviceBadgeClass: Record<TypeAutorisation, string> = {
    FIXE: 'badge-fixe',
    MOBILE_TERRESTRE: 'badge-mobile-terrestre',
    RADIODIFFUSION: 'badge-radiodif',
    MARITIME: 'badge-maritime',
    MOBILE_AERONAUTIQUE: 'badge-aeronautique',
    AMATEUR: 'badge-amateur',
    SATELLITE: 'badge-satellite'
  };

  readonly statutLabels: Record<StatutAutorisation, string> = {
    EN_ATTENTE: 'En attente',
    ACTIVE: 'Active',
    SUSPENDUE: 'Suspendue',
    EXPIREE: 'Expirée'
  };

  readonly statutBadgeClass: Record<StatutAutorisation, string> = {
    EN_ATTENTE: 'badge-pending',
    ACTIVE: 'badge-active',
    SUSPENDUE: 'badge-suspended',
    EXPIREE: 'badge-expired'
  };

  constructor(
    private service: AutorisationService,
    private clientService: ClientService
  ) { }

  ngOnInit(): void {
    this.refreshData();
  }

  refreshData(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.isLoading = true;
    this.errorMsg = '';
    this.clientService.getAllClients().subscribe({
      next: (data) => {
        this.clients = data;
        this.clientsMap = new Map(data.map(c => [c.id!, c]));
        this.loadAuthorizations();
        this.loadStats();
      },
      error: () => {
        this.errorMsg = 'Impossible de charger la base de données des clients. Assurez-vous que le client-service est démarré.';
        this.isLoading = false;
      }
    });
  }

  loadAuthorizations(): void {
    this.service.getAllAutorisations().subscribe({
      next: (data: Autorisation[]) => {
        this.authorizations = data.map(auth => {
          const serviceVal = auth.service || auth.type || 'FIXE';
          return {
            ...auth,
            service: serviceVal,
            type: serviceVal,
            client: auth.clientId ? this.clientsMap.get(auth.clientId) : undefined
          };
        });
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err: { status?: number; error?: { message?: string } }) => {
        this.errorMsg = err.status === 0
          ? 'Impossible de joindre le serveur. Vérifiez que la passerelle ou le service d\'autorisation est démarré.'
          : `Erreur ${err.status}: ${err.error?.message ?? 'Échec lors de la récupération des autorisations.'}`;
        this.isLoading = false;
      }
    });
  }

  loadStats(): void {
    this.service.getStats().subscribe({
      next: (stats) => {
        const parStat = stats.parStatut || {};
        this.stats = {
          ...stats,
          actives: parStat['ACTIVE'] ?? stats.actives ?? 0,
          en_attente: parStat['EN_ATTENTE'] ?? stats.en_attente ?? 0,
          expirees: parStat['EXPIREE'] ?? stats.expirees ?? 0,
          suspendues: parStat['SUSPENDUE'] ?? stats.suspendues ?? 0
        };
      },
      error: () => {
        this.stats = this.calculateLocalStats();
      }
    });
  }

  calculateLocalStats(): AutorisationStats {
    const total = this.authorizations.length;
    const actives = this.authorizations.filter(a => a.statut === 'ACTIVE').length;
    const en_attente = this.authorizations.filter(a => a.statut === 'EN_ATTENTE').length;
    const expirees = this.authorizations.filter(a => a.statut === 'EXPIREE').length;
    const suspendues = this.authorizations.filter(a => a.statut === 'SUSPENDUE').length;
    return { total, actives, en_attente, expirees, suspendues };
  }

  getAuthZone(auth: Autorisation): string {
    return auth.zoneService || auth.localisationZone || auth.zoneServiceFixe || auth.zoneNavigation || auth.zoneOperation || '';
  }

  getAuthAllFrequencies(auth: Autorisation): number[] {
    const freqs: (number | undefined | null)[] = [
      auth.frequenceEmission,
      auth.frequenceReception,
      auth.frequenceCentrale,
      auth.frequenceRadio,
      auth.frequenceImage,
      auth.frequenceMaritime,
      auth.frequenceAero,
      auth.frequenceAmateur
    ];
    return freqs.filter((f): f is number => f !== undefined && f !== null && !isNaN(Number(f)));
  }

  getAuthFrequenceDisplay(auth: Autorisation): string {
    const s = auth.service || auth.type;
    switch (s) {
      case 'FIXE':
        if (auth.frequenceEmission != null && auth.frequenceReception != null) {
          return `${auth.frequenceEmission} / ${auth.frequenceReception} MHz`;
        }
        if (auth.frequenceEmission != null) return `Tx: ${auth.frequenceEmission} MHz`;
        if (auth.frequenceReception != null) return `Rx: ${auth.frequenceReception} MHz`;
        break;
      case 'MOBILE_TERRESTRE':
        if (auth.frequenceCentrale != null) return `${auth.frequenceCentrale} MHz`;
        break;
      case 'RADIODIFFUSION':
        if (auth.frequenceRadio != null) return `${auth.frequenceRadio} MHz`;
        if (auth.frequenceImage != null) return `${auth.frequenceImage} MHz`;
        if (auth.bandeFrequences) return auth.bandeFrequences;
        break;
      case 'MARITIME':
        if (auth.frequenceMaritime != null) return `${auth.frequenceMaritime} MHz`;
        break;
      case 'MOBILE_AERONAUTIQUE':
        if (auth.frequenceAero != null) return `${auth.frequenceAero} MHz`;
        break;
      case 'AMATEUR':
        if (auth.frequenceAmateur != null) return `${auth.frequenceAmateur} MHz`;
        break;
      case 'SATELLITE':
        if (auth.bandeFreqSat) return `Bande ${auth.bandeFreqSat}`;
        break;
    }

    const anyFreq = auth.frequenceCentrale ?? auth.frequenceEmission ?? auth.frequenceRadio ??
      auth.frequenceMaritime ?? auth.frequenceAero ?? auth.frequenceAmateur ?? auth.frequenceReception;
    if (anyFreq != null) {
      return `${anyFreq} MHz`;
    }
    return '';
  }

  matchFrequency(auth: Autorisation, filter: string): boolean {
    const clean = filter.trim();
    if (!clean) return true;

    const allFreqs = this.getAuthAllFrequencies(auth);
    const freqDisplay = this.getAuthFrequenceDisplay(auth).toLowerCase();

    // Matching string in display or text band fields (e.g. "Ku", "FM", "VHF")
    if (freqDisplay.includes(clean)) return true;
    if (auth.bandeFrequences && auth.bandeFrequences.toLowerCase().includes(clean)) return true;
    if (auth.bandeFreqSat && auth.bandeFreqSat.toLowerCase().includes(clean)) return true;

    // Check range "800-900", "800..900", "800 - 900"
    const rangeMatch = clean.match(/^(\d+(?:\.\d+)?)\s*(?:-|–|\.\.)\s*(\d+(?:\.\d+)?)$/);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      return allFreqs.some(f => f >= min && f <= max);
    }

    // Check greater than/equal ">900", ">=900"
    const gtMatch = clean.match(/^>=\s*(\d+(?:\.\d+)?)$/) || clean.match(/^>\s*(\d+(?:\.\d+)?)$/);
    if (gtMatch) {
      const val = parseFloat(gtMatch[1]);
      return allFreqs.some(f => f >= val);
    }

    // Check less than/equal "<900", "<=900"
    const ltMatch = clean.match(/^<=\s*(\d+(?:\.\d+)?)$/) || clean.match(/^<\s*(\d+(?:\.\d+)?)$/);
    if (ltMatch) {
      const val = parseFloat(ltMatch[1]);
      return allFreqs.some(f => f <= val);
    }

    // Check partial number or exact match in numeric frequencies
    return allFreqs.some(f => f.toString().includes(clean));
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm ||
      this.selectedZone ||
      this.selectedFrequence ||
      this.selectedService ||
      this.selectedStatut ||
      this.selectedClientId
    );
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedZone = '';
    this.selectedFrequence = '';
    this.selectedService = '';
    this.selectedStatut = '';
    this.selectedClientId = '';
    this.applyFilters();
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();
    const zoneFilter = this.selectedZone.toLowerCase().trim();
    const freqFilter = this.selectedFrequence.toLowerCase().trim();

    this.filteredAuthorizations = this.authorizations.filter((a) => {
      const clientName = a.client ? `${a.client.nom} ${a.client.prenom ?? ''}`.toLowerCase() : '';
      const clientEmail = a.client?.email?.toLowerCase() ?? '';
      const summary = this.getServiceSpecificSummary(a).toLowerCase();
      const currentService = a.service || a.type;
      const authZone = this.getAuthZone(a).toLowerCase();
      const freqDisplay = this.getAuthFrequenceDisplay(a).toLowerCase();
      const allFreqs = this.getAuthAllFrequencies(a);

      const matchesSearch = !term ||
        (a.numeroAutorisation && a.numeroAutorisation.toLowerCase().includes(term)) ||
        clientName.includes(term) ||
        clientEmail.includes(term) ||
        summary.includes(term) ||
        authZone.includes(term) ||
        freqDisplay.includes(term) ||
        allFreqs.some(f => f.toString().includes(term)) ||
        (a.indicatif && a.indicatif.toLowerCase().includes(term)) ||
        (a.immatriculation && a.immatriculation.toLowerCase().includes(term));

      const matchesZone = !zoneFilter || authZone.includes(zoneFilter);
      const matchesFreq = !freqFilter || this.matchFrequency(a, freqFilter);
      const matchesService = !this.selectedService || currentService === this.selectedService;
      const matchesStatut = !this.selectedStatut || a.statut === this.selectedStatut;
      const matchesClient = !this.selectedClientId || String(a.clientId) === this.selectedClientId;

      return matchesSearch && matchesZone && matchesFreq && matchesService && matchesStatut && matchesClient;
    });
  }

  getKanbanList(group: 'pending' | 'active' | 'archived'): Autorisation[] {
    return this.filteredAuthorizations.filter((auth) => {
      if (group === 'pending') {
        return auth.statut === 'EN_ATTENTE';
      } else if (group === 'active') {
        return auth.statut === 'ACTIVE';
      } else {
        return auth.statut === 'SUSPENDUE' || auth.statut === 'EXPIREE';
      }
    });
  }

  getServiceSpecificSummary(auth: Autorisation): string {
    const s = auth.service || auth.type;
    switch (s) {
      case 'FIXE':
        return [
          auth.frequenceEmission != null ? `Tx: ${auth.frequenceEmission} MHz` : '',
          auth.frequenceReception != null ? `Rx: ${auth.frequenceReception} MHz` : '',
          auth.typeModulation ? `Mod: ${auth.typeModulation}` : ''
        ].filter(Boolean).join(' • ');
      case 'MOBILE_TERRESTRE':
        return [
          auth.frequenceCentrale != null ? `Centrale: ${auth.frequenceCentrale} MHz` : '',
          auth.technologie ? `Tech: ${auth.technologie}` : '',
          auth.zoneService ? `Zone: ${auth.zoneService}` : ''
        ].filter(Boolean).join(' • ');
      case 'RADIODIFFUSION':
        return [
          auth.frequenceRadio != null ? `Fréq: ${auth.frequenceRadio} MHz` : '',
          auth.normeDiffusion ? `Norme: ${auth.normeDiffusion}` : '',
          auth.bandeFrequences ? `Bande: ${auth.bandeFrequences}` : ''
        ].filter(Boolean).join(' • ');
      case 'MARITIME':
        return [
          auth.typeNavire ? `Navire: ${auth.typeNavire}` : '',
          auth.numMMSI ? `MMSI: ${auth.numMMSI}` : '',
          auth.indicatifAppel ? `Call: ${auth.indicatifAppel}` : ''
        ].filter(Boolean).join(' • ');
      case 'MOBILE_AERONAUTIQUE':
        return [
          auth.typeAeronef ? `Aéronef: ${auth.typeAeronef}` : '',
          auth.immatriculation ? `Immat: ${auth.immatriculation}` : '',
          auth.modeCommunication ? `Mode: ${auth.modeCommunication}` : ''
        ].filter(Boolean).join(' • ');
      case 'AMATEUR':
        return [
          auth.indicatif ? `Indicatif: ${auth.indicatif}` : '',
          auth.classeAmateur ? `Classe ${auth.classeAmateur}` : '',
          auth.modeEmission ? `Mode: ${auth.modeEmission}` : ''
        ].filter(Boolean).join(' • ');
      case 'SATELLITE':
        return [
          auth.nomSatellite ? `Sat: ${auth.nomSatellite}` : '',
          auth.positionOrbitale ? `Orbite: ${auth.positionOrbitale}` : '',
          auth.typeSatellite ? `Type: ${auth.typeSatellite}` : ''
        ].filter(Boolean).join(' • ');
      default:
        return '';
    }
  }

  onFileChange(event: any, target: 'new' | 'edit'): void {
    const file = event.target.files?.[0];
    if (file) {
      if (target === 'new') {
        this.newAuth.diagrammeAntenne = file.name;
      } else if (this.selectedAuth) {
        this.selectedAuth.diagrammeAntenne = file.name;
      }
    }
  }

  openAddModal(): void {
    this.newAuth = this.emptyForm();
    this.currentStep = 1;
    this.submitError = '';
    this.submitSuccess = '';
    this.showAddModal = true;
  }

  closeAddModal(): void {
    if (!this.isSubmitting) {
      this.showAddModal = false;
    }
  }

  goToStep2(): void {
    this.submitError = '';
    if (!this.newAuth.clientId || Number(this.newAuth.clientId) === 0) {
      this.submitError = 'Veuillez sélectionner un client titulaire.';
      return;
    }
    if (!this.newAuth.service) {
      this.submitError = 'Veuillez choisir un service.';
      return;
    }
    if (!this.newAuth.dateDebut) {
      this.submitError = 'La date de début est obligatoire.';
      return;
    }
    this.currentStep = 2;
  }

  goToStep1(): void {
    this.submitError = '';
    this.currentStep = 1;
  }

  openDetailsModal(auth: Autorisation): void {
    const serviceVal = auth.service || auth.type || 'FIXE';
    this.selectedAuth = { ...auth, service: serviceVal, type: serviceVal };
    this.detailStep = 1;
    this.submitError = '';
    this.submitSuccess = '';
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    if (!this.isSubmitting) {
      this.showDetailsModal = false;
      this.selectedAuth = null;
    }
  }

  onAddSubmit(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (!this.newAuth.clientId || !this.newAuth.service || !this.newAuth.dateDebut) {
      this.submitError = 'Veuillez remplir les informations obligatoires de l\'Étape 1.';
      this.currentStep = 1;
      return;
    }

    this.newAuth.clientId = Number(this.newAuth.clientId);
    this.newAuth.type = this.newAuth.service;

    this.isSubmitting = true;
    this.service.createAutorisation(this.newAuth).subscribe({
      next: (created) => {
        created.service = created.service || created.type || this.newAuth.service;
        created.client = this.clientsMap.get(created.clientId);
        this.authorizations.unshift(created);
        this.applyFilters();
        this.loadStats();
        this.isSubmitting = false;
        this.submitSuccess = `Autorisation "${created.numeroAutorisation || created.id}" créée avec succès !`;
        setTimeout(() => this.closeAddModal(), 1500);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = err.error?.message ?? 'Erreur lors de la création de l\'autorisation.';
      }
    });
  }

  onUpdateSubmit(): void {
    if (!this.selectedAuth || !this.selectedAuth.id) return;
    this.submitError = '';
    this.submitSuccess = '';

    this.selectedAuth.clientId = Number(this.selectedAuth.clientId);
    this.selectedAuth.service = this.selectedAuth.service || this.selectedAuth.type || 'FIXE';
    this.selectedAuth.type = this.selectedAuth.service;

    const id = this.selectedAuth.id;
    this.isSubmitting = true;

    this.service.updateAutorisation(id, this.selectedAuth).subscribe({
      next: (updated) => {
        updated.service = updated.service || updated.type || this.selectedAuth!.service;
        updated.client = this.clientsMap.get(updated.clientId);
        const idx = this.authorizations.findIndex(a => a.id === updated.id);
        if (idx !== -1) {
          this.authorizations[idx] = updated;
          this.applyFilters();
          this.loadStats();
        }
        this.isSubmitting = false;
        this.submitSuccess = 'Modifications enregistrées avec succès !';
        setTimeout(() => this.closeDetailsModal(), 1200);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = err.error?.message ?? 'Erreur lors de la mise à jour.';
      }
    });
  }

  changeStatut(auth: Autorisation, statut: StatutAutorisation): void {
    if (!auth.id) return;
    this.service.updateStatut(auth.id, statut).subscribe({
      next: (updated) => {
        updated.service = updated.service || updated.type || auth.service;
        updated.client = this.clientsMap.get(updated.clientId);
        const idx = this.authorizations.findIndex(a => a.id === updated.id);
        if (idx !== -1) {
          this.authorizations[idx] = updated;
          this.applyFilters();
          this.loadStats();
        }
        if (this.selectedAuth && this.selectedAuth.id === auth.id) {
          this.selectedAuth.statut = statut;
        }
      },
      error: (err) => {
        alert(err.error?.message ?? 'Impossible de modifier le statut.');
      }
    });
  }

  onDelete(auth: Autorisation): void {
    if (!auth.id) return;
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'autorisation "${auth.numeroAutorisation || auth.id}" ?`)) {
      this.service.deleteAutorisation(auth.id).subscribe({
        next: () => {
          this.authorizations = this.authorizations.filter(a => a.id !== auth.id);
          this.applyFilters();
          this.loadStats();
          this.closeDetailsModal();
        },
        error: (err) => {
          alert(err.error?.message ?? 'Erreur lors de la suppression.');
        }
      });
    }
  }

  getClientName(auth: Autorisation): string {
    if (auth.client) {
      return `${auth.client.nom} ${auth.client.prenom || ''}`.trim();
    }
    const client = this.clientsMap.get(auth.clientId);
    if (client) {
      return `${client.nom} ${client.prenom || ''}`.trim();
    }
    return `Client ID : ${auth.clientId}`;
  }

  getClientInitials(auth: Autorisation): string {
    const name = this.getClientName(auth);
    if (name.startsWith('Client ID')) return 'CL';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'CL';
  }

  private emptyForm(): Autorisation {
    return {
      clientId: 0,
      service: 'FIXE',
      type: 'FIXE',
      statut: 'EN_ATTENTE',
      dateDebut: new Date().toISOString().split('T')[0],
      dateFin: '',
      conditions: '',
      observations: ''
    };
  }
}

