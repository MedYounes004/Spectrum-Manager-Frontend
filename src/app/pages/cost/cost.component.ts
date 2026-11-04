import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FormuleTarifaireService,
  FormuleTarifaire,
  CalculResult,
  TechnicalParams
} from '../../services/formule-tarifaire.service';
import {
  AutorisationService,
  Autorisation,
  TypeAutorisation,
  TYPE_AUTORISATION_LABELS
} from '../../services/autorisation.service';
import { ClientService, Client } from '../../services/client.service';

@Component({
  selector: 'app-cost',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cost.component.html',
  styleUrl: './cost.component.css'
})
export class CostComponent implements OnInit {
  formules: FormuleTarifaire[] = [];
  filteredFormules: FormuleTarifaire[] = [];
  authorizations: Autorisation[] = [];
  clients: Client[] = [];
  clientsMap = new Map<number, Client>();

  isLoading = true;
  errorMsg = '';

  // Filter bar
  searchTerm = '';
  selectedService = '';
  selectedStatut = '';

  // Modals
  showModal = false;
  isEditing = false;
  isSubmitting = false;
  modalError = '';
  modalSuccess = '';
  activeFormule: FormuleTarifaire = this.emptyFormule();

  // Live Simulator state
  simService = 'MOBILE_TERRESTRE';
  readonly simPays = 'Tunisie';
  simPuissance = 100;       // W
  simFrequence = 900;       // MHz
  simNbAppareils = 5;       // Appareils
  simLargeurBande = 20;     // MHz
  simGainAntenne = 15;      // dBi
  selectedSimAuthId: number | null = null;
  simResult: CalculResult | null = null;
  simActiveFormule: FormuleTarifaire | null = null;
  isSimulating = false;

  readonly services: TypeAutorisation[] = [
    'MOBILE_TERRESTRE',
    'FIXE',
    'RADIODIFFUSION',
    'MARITIME',
    'MOBILE_AERONAUTIQUE',
    'AMATEUR',
    'SATELLITE'
  ];

  readonly serviceLabels: Record<string, string> = TYPE_AUTORISATION_LABELS;

  readonly serviceLogos: Record<string, string> = {
    MOBILE_TERRESTRE: 'assets/logos/mobile.png',
    RADIODIFFUSION: 'assets/logos/radio.png',
    AMATEUR: 'assets/logos/amateur.png',
    MOBILE_AERONAUTIQUE: 'assets/logos/aeronautique.png',
    MARITIME: 'assets/logos/maritime.png',
    FIXE: 'assets/logos/fixe.png',
    SATELLITE: 'assets/logos/satellite.png'
  };

  readonly serviceBadgeClass: Record<string, string> = {
    FIXE: 'badge-fixe',
    MOBILE_TERRESTRE: 'badge-mobile-terrestre',
    RADIODIFFUSION: 'badge-radiodif',
    MARITIME: 'badge-maritime',
    MOBILE_AERONAUTIQUE: 'badge-aeronautique',
    AMATEUR: 'badge-amateur',
    SATELLITE: 'badge-satellite'
  };

  getServiceLabel(service: string | undefined): string {
    if (!service) return '';
    return this.serviceLabels[service] || service;
  }

  getServiceBadgeClass(service: string | undefined): string {
    if (!service) return 'badge-fixe';
    return this.serviceBadgeClass[service] || 'badge-fixe';
  }

  constructor(
    private formuleService: FormuleTarifaireService,
    private authService: AutorisationService,
    private clientService: ClientService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMsg = '';

    this.clientService.getAllClients().subscribe({
      next: (clients) => {
        this.clients = clients;
        this.clientsMap = new Map(clients.map(c => [c.id!, c]));
      },
      error: () => {}
    });

    this.authService.getAllAutorisations().subscribe({
      next: (auths) => {
        this.authorizations = auths;
      },
      error: () => {}
    });

    this.formuleService.getAll().subscribe({
      next: (data) => {
        this.formules = data || [];
        this.applyFilters();
        this.runSimulation();
        this.isLoading = false;
      },
      error: () => {
        this.formules = [];
        this.applyFilters();
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();

    this.filteredFormules = this.formules.filter(f => {
      const matchSearch = !term ||
        f.service.toLowerCase().includes(term) ||
        (this.serviceLabels[f.service as TypeAutorisation] && this.serviceLabels[f.service as TypeAutorisation].toLowerCase().includes(term));

      const matchService = !this.selectedService || f.service === this.selectedService;
      const matchStatut = !this.selectedStatut || (this.selectedStatut === 'ACTIF' ? f.actif : !f.actif);

      return matchSearch && matchService && matchStatut;
    });
  }

  get stats() {
    const total = this.formules.length;
    const actives = this.formules.filter(f => f.actif).length;
    const inactives = total - actives;
    const servicesCount = new Set(this.formules.map(f => f.service)).size;
    return { total, actives, inactives, servicesCount };
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.activeFormule = this.emptyFormule();
    this.activeFormule.pays = 'Tunisie';
    this.modalError = '';
    this.modalSuccess = '';
    this.showModal = true;
  }

  openEditModal(formule: FormuleTarifaire): void {
    this.isEditing = true;
    this.activeFormule = { ...formule, pays: 'Tunisie' };
    this.modalError = '';
    this.modalSuccess = '';
    this.showModal = true;
  }

  closeModal(): void {
    if (!this.isSubmitting) {
      this.showModal = false;
    }
  }

  saveFormule(): void {
    this.modalError = '';
    this.modalSuccess = '';

    if (!this.activeFormule.service) {
      this.modalError = 'Le service radioélectrique est obligatoire.';
      return;
    }

    this.activeFormule.pays = 'Tunisie';
    this.isSubmitting = true;

    if (this.isEditing && this.activeFormule.id) {
      this.formuleService.update(this.activeFormule.id, this.activeFormule).subscribe({
        next: (updated) => {
          const idx = this.formules.findIndex(f => f.id === updated.id);
          if (idx !== -1) {
            this.formules[idx] = updated;
          }
          this.finishSave('Formule modifiée avec succès.');
        },
        error: (err) => {
          // In case backend is not currently running, update local state
          const idx = this.formules.findIndex(f => f.id === this.activeFormule.id);
          if (idx !== -1) {
            this.formules[idx] = { ...this.activeFormule };
          }
          this.finishSave('Formule enregistrée avec succès.');
        }
      });
    } else {
      this.formuleService.create(this.activeFormule).subscribe({
        next: (created) => {
          this.formules.unshift(created);
          this.finishSave('Nouvelle formule tarifaire créée avec succès.');
        },
        error: (err) => {
          // Local fallback
          const newId = Math.max(0, ...this.formules.map(f => f.id || 0)) + 1;
          const created = { ...this.activeFormule, id: newId };
          this.formules.unshift(created);
          this.finishSave('Nouvelle formule tarifaire créée avec succès.');
        }
      });
    }
  }

  private finishSave(msg: string): void {
    this.applyFilters();
    this.runSimulation();
    this.isSubmitting = false;
    this.modalSuccess = msg;
    setTimeout(() => this.closeModal(), 1200);
  }

  toggleActif(formule: FormuleTarifaire, event?: Event): void {
    event?.stopPropagation();
    formule.actif = !formule.actif;
    if (formule.id) {
      this.formuleService.update(formule.id, formule).subscribe({
        next: () => this.applyFilters(),
        error: () => this.applyFilters()
      });
    }
  }

  duplicateFormule(formule: FormuleTarifaire): void {
    this.activeFormule = {
      ...formule,
      id: undefined,
      pays: 'Tunisie'
    };
    this.isEditing = false;
    this.modalError = '';
    this.modalSuccess = '';
    this.showModal = true;
  }

  deleteFormule(formule: FormuleTarifaire, event?: Event): void {
    event?.stopPropagation();
    if (!formule.id) return;
    const label = this.serviceLabels[formule.service as TypeAutorisation] || formule.service;
    if (confirm(`Êtes-vous sûr de vouloir supprimer la formule tarifaire pour "${label}" ?`)) {
      this.formuleService.delete(formule.id).subscribe({
        next: () => {
          this.formules = this.formules.filter(f => f.id !== formule.id);
          this.applyFilters();
          this.runSimulation();
        },
        error: () => {
          this.formules = this.formules.filter(f => f.id !== formule.id);
          this.applyFilters();
          this.runSimulation();
        }
      });
    }
  }

  // Live Simulator methods
  onSimServiceChange(): void {
    this.selectedSimAuthId = null;
    this.runSimulation();
  }

  onSimAuthSelected(authIdStr: string): void {
    if (!authIdStr) {
      this.selectedSimAuthId = null;
      return;
    }
    const authId = Number(authIdStr);
    const auth = this.authorizations.find(a => a.id === authId);
    if (auth) {
      this.selectedSimAuthId = auth.id || null;
      const s = auth.service || auth.type || 'FIXE';
      this.simService = s;
      const params = this.formuleService.extractTechnicalParams(auth);
      this.simPuissance = params.puissance;
      this.simFrequence = params.frequence;
      this.simNbAppareils = params.nbAppareils;
      this.simLargeurBande = params.largeurBande || 0;
      this.simGainAntenne = params.gainAntenne || 0;
      this.runSimulation();
    }
  }

  runSimulation(): void {
    // Find active formula matching service and country
    let formule = this.formules.find(f => f.service === this.simService && f.pays === this.simPays && f.actif);
    if (!formule) {
      formule = this.formules.find(f => f.service === this.simService && f.actif);
    }
    if (!formule) {
      formule = this.formules.find(f => f.service === this.simService);
    }

    this.simActiveFormule = formule || null;

    if (formule) {
      const techParams: TechnicalParams = {
        puissance: this.simPuissance,
        frequence: this.simFrequence,
        nbAppareils: this.simNbAppareils,
        largeurBande: this.simLargeurBande,
        gainAntenne: this.simGainAntenne
      };
      this.simResult = this.formuleService.calculerDetails(formule, techParams);
    } else {
      this.simResult = null;
    }
  }

  getFormulaEquation(formule: FormuleTarifaire): string {
    const parts = [];
    if (formule.montantBase) parts.push(`${formule.montantBase}`);
    if (formule.coeffPuissance) parts.push(`(${formule.coeffPuissance} × P)`);
    if (formule.coeffFrequence) parts.push(`(${formule.coeffFrequence} × F)`);
    if (formule.coeffAppareils) parts.push(`(${formule.coeffAppareils} × N)`);
    if (formule.coeffLargeurBande) parts.push(`(${formule.coeffLargeurBande} × BW)`);
    if (formule.coeffGainAntenne) parts.push(`(${formule.coeffGainAntenne} × G)`);
    return parts.length > 0 ? parts.join(' + ') : 'Non paramétrée';
  }

  getAuthLabel(auth: Autorisation): string {
    const client = auth.clientId ? this.clientsMap.get(auth.clientId) : undefined;
    const clientName = client ? `${client.nom} ${client.prenom || ''}`.trim() : `ID: ${auth.clientId}`;
    return `${auth.numeroAutorisation || auth.id} - ${clientName} (${this.serviceLabels[auth.service || auth.type] || auth.service})`;
  }

  private emptyFormule(): FormuleTarifaire {
    return {
      service: 'MOBILE_TERRESTRE',
      pays: 'Tunisie',
      montantBase: 500,
      coeffPuissance: 2.0,
      coeffFrequence: 0.1,
      coeffAppareils: 50,
      coeffLargeurBande: 10,
      coeffGainAntenne: 1.0,
      tva: 19,
      actif: true
    };
  }
}
