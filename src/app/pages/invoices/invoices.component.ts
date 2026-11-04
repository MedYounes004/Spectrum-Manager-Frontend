import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FactureService,
  Facture,
  TypeFacture,
  TypeOperationFacture,
  StatutFacture,
  FactureStats,
  TYPE_FACTURE_LABELS,
  TYPE_OPERATION_LABELS,
  STATUT_FACTURE_LABELS
} from '../../services/facture.service';
import {
  AutorisationService,
  Autorisation,
  TypeAutorisation,
  TYPE_AUTORISATION_LABELS
} from '../../services/autorisation.service';
import { ClientService, Client } from '../../services/client.service';
import { FormuleTarifaireService, FormuleTarifaire } from '../../services/formule-tarifaire.service';

type InvoiceView = 'billing' | 'invoices';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.css'
})
export class InvoicesComponent implements OnInit {
  activeView: InvoiceView = 'billing';

  invoices: Facture[] = [];
  filteredInvoices: Facture[] = [];
  authorizations: Autorisation[] = [];
  formules: FormuleTarifaire[] = [];
  clients: Client[] = [];
  clientsMap = new Map<number, Client>();
  stats: FactureStats = { total: 0, payees: 0, en_attente: 0, en_retard: 0, total_montant: 0 };
  isLoading = true;
  isLoadingAuths = false;
  errorMsg = '';

  searchTerm = '';
  selectedClientId = '';
  selectedStatut = '';
  selectedType = '';
  selectedTypeAutorisation = '';

  authClientFilter = '';
  authSearchTerm = '';
  authServiceFilter = '';

  showAddModal = false;
  showDetailsModal = false;
  isSubmitting = false;
  submitError = '';
  submitSuccess = '';
  calculatedFormulaInfo = '';
  formulaFound = false;  // true si une formule a pu calculer le montant automatiquement

  newInvoice: Facture = this.emptyForm();
  selectedInvoice: Facture | null = null;
  selectedAutorisationIds: number[] = [];
  selectedFactureIdToCancel: number | undefined;

  readonly statusOptions: StatutFacture[] = ['EN_ATTENTE', 'PAYEE', 'EN_RETARD', 'ANNULEE'];
  readonly typeFactureOptions: TypeFacture[] = ['INDIVIDUELLE', 'COLLECTIVE', 'AVOIR'];
  readonly typeOptions: TypeOperationFacture[] = [
    'REDEVANCE', 'AMENDE', 'RENOUVELLEMENT', 'PENALITE', 'AUTRE'
  ];
  readonly serviceOptions: TypeAutorisation[] = [
    'FIXE', 'MOBILE_TERRESTRE', 'RADIODIFFUSION', 'MARITIME',
    'MOBILE_AERONAUTIQUE', 'AMATEUR', 'SATELLITE'
  ];

  readonly statutLabels = STATUT_FACTURE_LABELS;
  readonly typeOperationLabels = TYPE_OPERATION_LABELS;
  readonly typeFactureLabels = TYPE_FACTURE_LABELS;
  readonly typeAutorisationLabels = TYPE_AUTORISATION_LABELS;

  readonly statutBadgeClass: Record<StatutFacture, string> = {
    EN_ATTENTE: 'status-warning',
    PAYEE: 'status-success',
    EN_RETARD: 'status-danger',
    ANNULEE: 'status-muted',
    EN_COURS: 'status-primary'
  };

  constructor(
    private factureService: FactureService,
    private authService: AutorisationService,
    private clientService: ClientService,
    private formuleTarifaireService: FormuleTarifaireService
  ) { }

  ngOnInit(): void {
    this.refreshData();
  }

  switchView(view: InvoiceView): void {
    this.activeView = view;
  }

  refreshData(): void {
    this.loadClients();
    this.loadFormules();
  }

  loadFormules(): void {
    this.formuleTarifaireService.getAll().subscribe({
      next: (data) => {
        this.formules = data || [];
      },
      error: () => {
        this.formules = [];
      }
    });
  }

  loadClients(): void {
    this.isLoading = true;
    this.errorMsg = '';
    this.clientService.getAllClients().subscribe({
      next: (data) => {
        this.clients = data;
        this.clientsMap = new Map(data.map(c => [c.id!, c]));
        this.loadInvoices();
        this.loadStats();
        this.loadLinkedAuthorizations();
      },
      error: () => {
        this.errorMsg = 'Impossible de charger la base de données des clients.';
        this.isLoading = false;
      }
    });
  }

  loadInvoices(): void {
    this.factureService.getAllFactures().subscribe({
      next: (data) => {
        this.invoices = data.map(invoice => ({
          ...invoice,
          client: invoice.clientId ? this.clientsMap.get(invoice.clientId) : undefined
        }));
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMsg = err.status === 0
          ? 'Impossible de joindre le serveur. Vérifiez que l\'API Gateway (port 8083) est démarrée.'
          : `Erreur ${err.status}: ${err.error?.message ?? 'Échec lors de la récupération des factures.'}`;
        this.isLoading = false;
      }
    });
  }

  loadStats(): void {
    this.factureService.getStats().subscribe({
      next: (stats) => {
        const parStat = stats.parStatut || {};
        this.stats = {
          ...stats,
          payees: parStat['PAYEE'] ?? parStat['Payée'] ?? stats.payees ?? 0,
          en_attente: parStat['EN_ATTENTE'] ?? parStat['En attente'] ?? stats.en_attente ?? 0,
          en_retard: parStat['EN_RETARD'] ?? parStat['En retard'] ?? stats.en_retard ?? 0,
          total_montant: stats.totalMontantPaye ?? stats.total_montant ?? 0
        };
      },
      error: () => {
        this.stats = this.calculateLocalStats();
      }
    });
  }

  calculateLocalStats(): FactureStats {
    const total = this.invoices.length;
    const payees = this.invoices.filter(f => f.statut === 'PAYEE').length;
    const en_attente = this.invoices.filter(f => f.statut === 'EN_ATTENTE').length;
    const en_retard = this.invoices.filter(f => f.statut === 'EN_RETARD').length;
    const total_montant = this.invoices
      .filter(f => f.statut === 'PAYEE')
      .reduce((sum, f) => sum + (f.montant || 0), 0);
    return { total, payees, en_attente, en_retard, total_montant };
  }

  loadLinkedAuthorizations(): void {
    this.isLoadingAuths = true;
    this.authService.getAllAutorisations().subscribe({
      next: (data) => {
        this.authorizations = data.map(auth => ({
          ...auth,
          client: auth.clientId ? this.clientsMap.get(auth.clientId) : undefined
        }));
        this.isLoadingAuths = false;
      },
      error: () => {
        this.authorizations = [];
        this.isLoadingAuths = false;
      }
    });
  }

  get filteredAuthorizationsForBilling(): Autorisation[] {
    const term = this.authSearchTerm.toLowerCase().trim();
    return this.authorizations.filter(auth => {
      const clientName = this.getAuthClientName(auth).toLowerCase();
      const service = auth.service || auth.type || '';
      const matchesClient = !this.authClientFilter || String(auth.clientId) === this.authClientFilter;
      const matchesService = !this.authServiceFilter || service === this.authServiceFilter;
      const matchesSearch = !term ||
        clientName.includes(term) ||
        (auth.numeroAutorisation?.toLowerCase().includes(term)) ||
        service.toLowerCase().includes(term);
      return matchesClient && matchesService && matchesSearch;
    });
  }

  get selectedAuthorizations(): Autorisation[] {
    return this.authorizations.filter(a => a.id && this.selectedAutorisationIds.includes(a.id));
  }

  get billingModeLabel(): string {
    const count = this.selectedAutorisationIds.length;
    if (count === 0) return 'Sélectionnez une ou plusieurs autorisations';
    if (count === 1) return 'Facture individuelle (1 autorisation)';
    return `Facture collective (${count} autorisations)`;
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredInvoices = this.invoices.filter((f) => {
      const clientName = f.client ? `${f.client.nom} ${f.client.prenom ?? ''}`.toLowerCase() : '';
      const matchesSearch = !term ||
        (f.numeroFacture?.toLowerCase().includes(term)) ||
        clientName.includes(term) ||
        (f.description?.toLowerCase().includes(term));
      const matchesClient = !this.selectedClientId || String(f.clientId) === this.selectedClientId;
      const matchesStatus = !this.selectedStatut || f.statut === this.selectedStatut;
      const matchesType = !this.selectedType || f.type === this.selectedType || f.typeFacture === this.selectedType;
      const matchesTypeAutorisation = !this.selectedTypeAutorisation || f.typeAutorisation === this.selectedTypeAutorisation;
      return matchesSearch && matchesClient && matchesStatus && matchesType && matchesTypeAutorisation;
    });
  }

  onAuthClientFilterChange(): void {
    this.selectedAutorisationIds = [];
  }

  toggleAutorisation(authId: number): void {
    const idx = this.selectedAutorisationIds.indexOf(authId);
    if (idx !== -1) {
      this.selectedAutorisationIds.splice(idx, 1);
    } else {
      this.selectedAutorisationIds.push(authId);
    }
    if (this.showAddModal) {
      this.autoCalculateInvoiceAmount();
    }
  }

  toggleAllFilteredAuthorizations(): void {
    const filtered = this.filteredAuthorizationsForBilling;
    const filteredIds = filtered.map(a => a.id!).filter(Boolean);
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => this.selectedAutorisationIds.includes(id));
    if (allSelected) {
      this.selectedAutorisationIds = this.selectedAutorisationIds.filter(id => !filteredIds.includes(id));
    } else {
      const merged = new Set([...this.selectedAutorisationIds, ...filteredIds]);
      this.selectedAutorisationIds = Array.from(merged);
    }
    if (this.showAddModal) {
      this.autoCalculateInvoiceAmount();
    }
  }

  isAuthSelected(authId?: number): boolean {
    return !!authId && this.selectedAutorisationIds.includes(authId);
  }

  areAllFilteredSelected(): boolean {
    const filtered = this.filteredAuthorizationsForBilling;
    return filtered.length > 0 && filtered.every(a => this.isAuthSelected(a.id));
  }

  openBillingFromSelection(): void {
    if (this.selectedAutorisationIds.length === 0) {
      alert('Veuillez sélectionner au moins une autorisation à facturer.');
      return;
    }

    const selected = this.selectedAuthorizations;
    const clientIds = new Set(selected.map(a => a.clientId));
    if (clientIds.size > 1) {
      alert('Les autorisations sélectionnées doivent appartenir au même client.');
      return;
    }

    const first = selected[0];
    this.newInvoice = this.emptyForm();
    this.newInvoice.clientId = first.clientId;
    this.selectedFactureIdToCancel = undefined;
    this.submitError = '';
    this.submitSuccess = '';
    this.calculatedFormulaInfo = '';

    if (selected.length === 1) {
      this.newInvoice.typeFacture = 'INDIVIDUELLE';
      this.newInvoice.autorisationId = first.id;
      this.newInvoice.typeAutorisation = first.service || first.type;
      this.newInvoice.description = `Facturation pour l'autorisation ${first.numeroAutorisation}`;
    } else {
      this.newInvoice.typeFacture = 'COLLECTIVE';
      this.newInvoice.description = `Facture collective — ${selected.length} autorisations`;
    }

    this.autoCalculateInvoiceAmount();
    this.showAddModal = true;
  }

  openAddModal(): void {
    this.newInvoice = this.emptyForm();
    this.selectedAutorisationIds = [];
    this.selectedFactureIdToCancel = undefined;
    this.submitError = '';
    this.submitSuccess = '';
    this.calculatedFormulaInfo = '';
    this.formulaFound = false;
    this.showAddModal = true;
  }

  closeAddModal(): void {
    if (!this.isSubmitting) {
      this.showAddModal = false;
    }
  }

  openDetailsModal(facture: Facture): void {
    this.selectedInvoice = { ...facture };
    this.submitError = '';
    this.submitSuccess = '';
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    if (!this.isSubmitting) {
      this.showDetailsModal = false;
      this.selectedInvoice = null;
    }
  }

  onLinkAuthorizationChange(authIdStr: string): void {
    if (!authIdStr) {
      this.calculatedFormulaInfo = '';
      return;
    }
    const authId = Number(authIdStr);
    const selected = this.authorizations.find(a => a.id === authId);
    if (selected) {
      this.newInvoice.clientId = selected.clientId;
      this.newInvoice.autorisationId = selected.id;
      this.newInvoice.typeAutorisation = selected.service || selected.type;
      this.newInvoice.description = `Facturation pour l'autorisation ${selected.numeroAutorisation}`;
      this.selectedAutorisationIds = selected.id ? [selected.id] : [];
      this.autoCalculateInvoiceAmount();
    }
  }

  autoCalculateInvoiceAmount(): void {
    this.calculatedFormulaInfo = '';
    this.formulaFound = false;

    if (this.newInvoice.typeFacture === 'INDIVIDUELLE' && this.newInvoice.autorisationId) {
      const auth = this.authorizations.find(a => a.id === Number(this.newInvoice.autorisationId));
      if (auth) {
        const service = auth.service || auth.type || 'FIXE';
        const formula = this.formules.find(f => f.service === service && f.actif)
          || this.formules.find(f => f.service === service);

        if (formula) {
          const params = this.formuleTarifaireService.extractTechnicalParams(auth);
          const result = this.formuleTarifaireService.calculerDetails(formula, params);
          this.newInvoice.montant = result.montantTTC;
          this.formulaFound = true;
          this.calculatedFormulaInfo = `⚡ Montant calculé par formule (${service}) : Base=${result.montantBase} + Coeffs = ${result.montantHT} TND HT + TVA ${result.tvaTaux}% = ${result.montantTTC} TND TTC`;
        } else {
          // Aucune formule trouvée pour ce service → l'utilisateur saisit manuellement
          this.formulaFound = false;
          this.calculatedFormulaInfo = '';
        }
      }
    } else if (this.newInvoice.typeFacture === 'COLLECTIVE' && this.selectedAutorisationIds.length > 0) {
      let totalTTC = 0;
      let countWithFormula = 0;
      for (const authId of this.selectedAutorisationIds) {
        const auth = this.authorizations.find(a => a.id === authId);
        if (auth) {
          const service = auth.service || auth.type || 'FIXE';
          const formula = this.formules.find(f => f.service === service && f.actif)
            || this.formules.find(f => f.service === service);
          if (formula) {
            const params = this.formuleTarifaireService.extractTechnicalParams(auth);
            const result = this.formuleTarifaireService.calculerDetails(formula, params);
            totalTTC += result.montantTTC;
            countWithFormula++;
          }
        }
      }
      if (totalTTC > 0) {
        this.newInvoice.montant = Math.round(totalTTC * 100) / 100;
        this.formulaFound = true;
        const msg = countWithFormula < this.selectedAutorisationIds.length
          ? ` (${this.selectedAutorisationIds.length - countWithFormula} sans formule non incluse)`
          : '';
        this.calculatedFormulaInfo = `⚡ Montant calculé pour ${countWithFormula} autorisations : ${this.newInvoice.montant} TND TTC${msg}`;
      } else {
        // Aucune formule trouvée pour aucun service → saisie manuelle
        this.formulaFound = false;
      }
    }
  }

  onFactureOriginaleChange(factureIdStr: string): void {
    if (!factureIdStr) return;
    const factureId = Number(factureIdStr);
    const selected = this.invoices.find(f => f.id === factureId);
    if (selected) {
      this.newInvoice.clientId = selected.clientId;
      this.newInvoice.autorisationId = selected.autorisationId;
      this.newInvoice.typeAutorisation = selected.typeAutorisation;
      this.newInvoice.description = `Avoir pour la facture ${selected.numeroFacture || selected.id}`;
      this.newInvoice.montant = selected.montant;
    }
  }

  onAddSubmit(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (this.newInvoice.typeFacture === 'AVOIR') {
      if (!this.selectedFactureIdToCancel) {
        this.submitError = 'Veuillez sélectionner la facture originale.';
        return;
      }
      this.isSubmitting = true;
      this.factureService.createFactureAvoir(this.selectedFactureIdToCancel, this.newInvoice.description || 'Avoir').subscribe({
        next: this.handleAddSuccess.bind(this),
        error: this.handleAddError.bind(this)
      });
      return;
    }

    if (this.newInvoice.typeFacture === 'COLLECTIVE') {
      const ids = this.selectedAutorisationIds.length > 0
        ? this.selectedAutorisationIds
        : (this.newInvoice.autorisationIds || []);
      if (!this.newInvoice.clientId || ids.length === 0) {
        this.submitError = 'Sélectionnez un client et au moins une autorisation.';
        return;
      }
      this.isSubmitting = true;
      this.factureService.createFactureCollective(
        Number(this.newInvoice.clientId),
        ids.map(Number),
        this.newInvoice.description || 'Facture collective',
        this.newInvoice.dateEmission,
        this.newInvoice.dateEcheance
      ).subscribe({
        next: this.handleAddSuccess.bind(this),
        error: this.handleAddError.bind(this)
      });
      return;
    }

    if (!this.newInvoice.clientId || !this.newInvoice.montant || !this.newInvoice.dateEmission ||
      !this.newInvoice.dateEcheance || !this.newInvoice.type || !this.newInvoice.statut) {
      this.submitError = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }
    if (this.newInvoice.montant <= 0) {
      this.submitError = 'Le montant doit être supérieur à 0.';
      return;
    }

    this.newInvoice.clientId = Number(this.newInvoice.clientId);
    if (this.newInvoice.autorisationId) {
      this.newInvoice.autorisationId = Number(this.newInvoice.autorisationId);
    } else {
      delete this.newInvoice.autorisationId;
    }

    this.isSubmitting = true;
    this.factureService.createFacture(this.newInvoice).subscribe({
      next: this.handleAddSuccess.bind(this),
      error: this.handleAddError.bind(this)
    });
  }

  private handleAddSuccess(created: Facture): void {
    created.client = this.clientsMap.get(created.clientId);
    this.invoices.unshift(created);
    this.applyFilters();
    this.loadStats();
    this.isSubmitting = false;
    this.selectedAutorisationIds = [];
    this.submitSuccess = `Facture "${created.numeroFacture || created.id}" créée avec succès.`;
    setTimeout(() => {
      this.closeAddModal();
      this.activeView = 'invoices';
    }, 1200);
  }

  private handleAddError(err: { error?: { message?: string } }): void {
    this.isSubmitting = false;
    this.submitError = err.error?.message ?? 'Erreur lors de l\'enregistrement.';
  }

  onUpdateSubmit(): void {
    if (!this.selectedInvoice?.id) return;
    this.submitError = '';
    this.selectedInvoice.clientId = Number(this.selectedInvoice.clientId);
    this.isSubmitting = true;

    this.factureService.updateFacture(this.selectedInvoice.id, this.selectedInvoice).subscribe({
      next: (updated) => {
        updated.client = this.clientsMap.get(updated.clientId);
        const idx = this.invoices.findIndex(i => i.id === updated.id);
        if (idx !== -1) this.invoices[idx] = updated;
        this.applyFilters();
        this.loadStats();
        this.isSubmitting = false;
        this.submitSuccess = 'Facture modifiée.';
        setTimeout(() => this.closeDetailsModal(), 1200);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = err.error?.message ?? 'Erreur lors de la mise à jour.';
      }
    });
  }

  marquerPayee(facture: Facture, event?: Event): void {
    event?.stopPropagation();
    if (!facture.id) return;
    this.isSubmitting = true;
    this.factureService.marquerPayee(facture.id).subscribe({
      next: (updated) => {
        updated.client = this.clientsMap.get(updated.clientId);
        const idx = this.invoices.findIndex(i => i.id === updated.id);
        if (idx !== -1) this.invoices[idx] = updated;
        if (this.selectedInvoice?.id === facture.id) this.selectedInvoice = updated;
        this.applyFilters();
        this.loadStats();
        this.isSubmitting = false;
        this.submitSuccess = 'Facture marquée comme payée.';
        setTimeout(() => { if (this.showDetailsModal) this.closeDetailsModal(); }, 800);
      },
      error: (err) => {
        this.isSubmitting = false;
        alert(err.error?.message ?? 'Impossible de marquer comme payée.');
      }
    });
  }

  onDelete(facture: Facture): void {
    if (!facture.id) return;
    if (confirm(`Supprimer la facture "${facture.numeroFacture || facture.id}" ?`)) {
      this.factureService.deleteFacture(facture.id).subscribe({
        next: () => {
          this.invoices = this.invoices.filter(i => i.id !== facture.id);
          this.applyFilters();
          this.loadStats();
          this.closeDetailsModal();
        },
        error: (err) => alert(err.error?.message ?? 'Erreur lors de la suppression.')
      });
    }
  }

  exportExcel(): void {
    if (this.filteredInvoices.length === 0) {
      alert('Aucune donnée à exporter.');
      return;
    }
    const headers = ['N° Facture', 'Client', 'Type charge', 'Service', 'Montant', 'Émission', 'Échéance', 'Statut'];
    const rows = this.filteredInvoices.map(f => [
      f.numeroFacture || '', this.getClientName(f),
      this.typeOperationLabels[f.type!] || f.type || '',
      this.getTypeAutorisationLabel(f.typeAutorisation),
      f.montant?.toFixed(2) || '0.00',
      f.dateEmission || '', f.dateEcheance || '',
      this.statutLabels[f.statut] || f.statut || ''
    ]);
    const csv = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `factures_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }

  downloadInvoicePdf(facture: Facture, event?: Event): void {
    event?.stopPropagation();
    const client = facture.client || (facture.clientId ? this.clientsMap.get(facture.clientId) : undefined);
    const clientName = client ? `${client.nom} ${client.prenom || ''}`.trim() : `Client #${facture.clientId}`;
    const linkedAuth = this.getLinkedAuthNumero(facture.autorisationId);
    const serviceLabel = this.getTypeAutorisationLabel(facture.typeAutorisation);
    const typeOpLabel = this.typeOperationLabels[facture.type!] || facture.type || 'Redevance Spectre';
    const typeFacLabel = this.typeFactureLabels[facture.typeFacture!] || 'Facture';
    const montant = Number(facture.montant || 0);
    const montantHT = (montant / 1.19);
    const montantTVA = (montant - montantHT);

    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) {
      alert('Veuillez autoriser les fenêtres pop-up pour afficher et télécharger la facture en PDF.');
      return;
    }

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Facture_${facture.numeroFacture || facture.id}.pdf</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      background: #ffffff;
      color: #1e293b;
      padding: 24px;
      font-size: 13px;
      line-height: 1.5;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .logo-section h1 {
      font-size: 22px;
      font-weight: 800;
      color: #4338ca;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    .logo-section p {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }
    .invoice-title-section {
      text-align: right;
    }
    .invoice-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .invoice-num {
      font-family: 'Courier New', monospace;
      font-size: 14px;
      font-weight: 700;
      color: #4f46e5;
      margin-top: 4px;
    }
    .paid-stamp {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 14px;
      background-color: #ecfdf5;
      color: #059669;
      border: 1.5px solid #10b981;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .parties-grid {
      display: table;
      width: 100%;
      margin-bottom: 24px;
    }
    .party-col {
      display: table-cell;
      width: 50%;
      vertical-align: top;
    }
    .party-col.right {
      padding-left: 20px;
    }
    .party-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .party-box h3 {
      font-size: 11px;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      font-weight: 700;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .party-box .name {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .party-box .detail {
      font-size: 12px;
      color: #475569;
      margin-bottom: 2px;
    }
    .meta-grid {
      display: table;
      width: 100%;
      background: #f1f5f9;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 24px;
    }
    .meta-col {
      display: table-cell;
      width: 25%;
    }
    .meta-label {
      font-size: 10px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 600;
    }
    .meta-val {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 2px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .items-table th {
      background: #4338ca;
      color: #ffffff;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      text-align: left;
    }
    .items-table th.text-right, .items-table td.text-right {
      text-align: right;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
    }
    .items-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .totals-container {
      width: 100%;
      display: table;
      margin-bottom: 30px;
    }
    .payment-info-col {
      display: table-cell;
      width: 55%;
      vertical-align: top;
      padding-right: 20px;
    }
    .totals-col {
      display: table-cell;
      width: 45%;
      vertical-align: top;
    }
    .payment-info-box {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .payment-info-box h4 {
      color: #065f46;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .payment-info-box p {
      font-size: 11.5px;
      color: #047857;
      margin-bottom: 3px;
    }
    .totals-table {
      width: 100%;
      border-collapse: collapse;
    }
    .totals-table td {
      padding: 6px 10px;
      font-size: 12px;
    }
    .totals-table tr.total-row {
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
      background: #f8fafc;
    }
    .totals-table tr.total-row td {
      font-size: 14px;
      font-weight: 800;
      color: #4338ca;
      padding: 10px;
    }
    .signature-box {
      margin-top: 20px;
      display: table;
      width: 100%;
    }
    .sig-col {
      display: table-cell;
      width: 100%;
      text-align: right;
    }
    .stamp-badge {
      display: inline-block;
      border: 2px dashed #4338ca;
      color: #4338ca;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      text-align: center;
    }
    .footer-section {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      text-align: center;
      color: #94a3b8;
      font-size: 10.5px;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
    .print-actions {
      text-align: center;
      margin-bottom: 20px;
      background: #f1f5f9;
      padding: 12px;
      border-radius: 8px;
    }
    .btn-print {
      background: #4f46e5;
      color: #fff;
      border: none;
      padding: 8px 20px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="print-actions no-print">
    <button class="btn-print" onclick="window.print()">📥 Imprimer / Télécharger en PDF</button>
  </div>

  <div class="invoice-card">
    <table class="header-table">
      <tr>
        <td class="logo-section">
          <h1>SPECTRUM MANAGER</h1>
          <p>SFM SPECTRE &bull; Agence Nationale des Fréquences</p>
          <p style="font-size: 11px; color: #94a3b8;">République Tunisienne &bull; Ministère des Technologies</p>
        </td>
        <td class="invoice-title-section">
          <div class="invoice-title">Facture Acquittée</div>
          <div class="invoice-num">${facture.numeroFacture || ('FAC-' + (facture.id || '001'))}</div>
          <div><span class="paid-stamp">&#10003; Payée &amp; Acquittée</span></div>
        </td>
      </tr>
    </table>

    <div class="parties-grid">
      <div class="party-col">
        <div class="party-box">
          <h3>Émetteur</h3>
          <div class="name">SFM Spectre - ANF</div>
          <div class="detail">Direction de la Gestion du Spectre</div>
          <div class="detail">Centre Urbain Nord, 1082 Tunis</div>
          <div class="detail">contact@anf-spectre.tn &bull; +216 71 000 000</div>
          <div class="detail">Matricule Fiscal : 0012345/A/M/000</div>
        </div>
      </div>
      <div class="party-col right">
        <div class="party-box">
          <h3>Destinataire (Client / Titulaire)</h3>
          <div class="name">${clientName}</div>
          <div class="detail">${client?.type === 'ENTREPRISE' ? 'Entreprise / Personne Morale' : 'Personne Physique'}</div>
          <div class="detail">${client?.email || 'Email non spécifié'} &bull; ${client?.telephone || ''}</div>
          <div class="detail">${client?.adresse || 'Tunisie'}</div>
          <div class="detail">Code Client : ${client?.codeClient || ('CL-' + facture.clientId)}</div>
        </div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-col">
        <div class="meta-label">Date d'émission</div>
        <div class="meta-val">${facture.dateEmission || '—'}</div>
      </div>
      <div class="meta-col">
        <div class="meta-label">Date d'échéance</div>
        <div class="meta-val">${facture.dateEcheance || '—'}</div>
      </div>
      <div class="meta-col">
        <div class="meta-label">Type &amp; Service</div>
        <div class="meta-val">${typeFacLabel} &bull; ${serviceLabel}</div>
      </div>
      <div class="meta-col">
        <div class="meta-label">Réf. Autorisation</div>
        <div class="meta-val">${linkedAuth || 'Licence Spectre'}</div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Désignation de la redevance</th>
          <th>Type de Charge</th>
          <th>Service / Bande</th>
          <th class="text-right">Montant (TND)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${facture.description || 'Redevance d\'utilisation des fréquences radioélectriques'}</strong>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              ${linkedAuth ? 'Autorisation n° ' + linkedAuth : ''} &bull; Service : ${serviceLabel}
            </div>
          </td>
          <td>${typeOpLabel}</td>
          <td>${serviceLabel}</td>
          <td class="text-right font-mono"><strong>${montant.toFixed(2)} TND</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="totals-container">
      <div class="payment-info-col">
        <div class="payment-info-box">
          <h4>&#10004; Confirmation de Règlement</h4>
          <p><strong>Statut :</strong> Intégralement Payée</p>
          <p><strong>Mode de paiement :</strong> ${facture.modePaiement || 'Virement bancaire'}</p>
          <p><strong>Réf. Transaction :</strong> ${facture.referencePaiement || ('PAY-' + (facture.id || '001') + '-' + (facture.dateEmission || '').replace(/-/g, ''))}</p>
          <p style="font-size: 11px; margin-top: 4px; color: #065f46;">Ce document atteste du paiement effectif des droits et redevances d'assignation spectrale.</p>
        </div>
      </div>
      <div class="totals-col">
        <table class="totals-table">
          <tr>
            <td>Total Brut (HT) :</td>
            <td class="text-right font-mono">${montantHT.toFixed(2)} TND</td>
          </tr>
          <tr>
            <td>TVA (19%) :</td>
            <td class="text-right font-mono">${montantTVA.toFixed(2)} TND</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL PAYÉ (TTC) :</td>
            <td class="text-right font-mono">${montant.toFixed(2)} TND</td>
          </tr>
        </table>
      </div>
    </div>

    <div class="signature-box">
      <div class="sig-col">
        <div class="stamp-badge">
          <div>Cachet Électronique SFM Spectre</div>
          <div style="font-size: 9px; margin-top: 4px;">CERTIFIÉ CONFORME &bull; PAYÉ</div>
        </div>
      </div>
    </div>

    <div class="footer-section" style="margin-top: 20px;">
      <p>SFM Spectre &bull; Système Intégré de Gestion du Spectre Radioélectrique</p>
      <p>Document officiel généré le ${new Date().toLocaleDateString('fr-FR')} &bull; Conformité Réglementation Nationale des Télécommunications</p>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  getTypeAutorisationLabel(type?: string): string {
    if (!type) return '—';
    return this.typeAutorisationLabels[type as TypeAutorisation] ?? type;
  }

  getAuthService(auth: Autorisation): string {
    return this.getTypeAutorisationLabel(auth.service || auth.type);
  }

  getLinkedAuthNumero(autorisationId?: number): string {
    const auth = this.authorizations.find(a => a.id === autorisationId);
    return auth?.numeroAutorisation || (autorisationId ? `ID: ${autorisationId}` : '');
  }

  getClientName(invoice: Facture): string {
    if (invoice.client) return `${invoice.client.nom} ${invoice.client.prenom || ''}`.trim();
    const c = this.clientsMap.get(invoice.clientId);
    return c ? `${c.nom} ${c.prenom || ''}`.trim() : `Client #${invoice.clientId}`;
  }

  getAuthClientName(auth: Autorisation): string {
    if (auth.client) return `${auth.client.nom} ${auth.client.prenom || ''}`.trim();
    const c = this.clientsMap.get(auth.clientId);
    return c ? `${c.nom} ${c.prenom || ''}`.trim() : `Client #${auth.clientId}`;
  }

  get clientAuthorizations(): Autorisation[] {
    if (!this.newInvoice.clientId) return [];
    return this.authorizations.filter(a => a.clientId === Number(this.newInvoice.clientId));
  }

  private emptyForm(): Facture {
    return {
      clientId: 0,
      typeFacture: 'INDIVIDUELLE',
      description: '',
      montant: 0,
      dateEmission: new Date().toISOString().split('T')[0],
      dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      statut: 'EN_ATTENTE',
      type: 'REDEVANCE',
      modePaiement: 'Virement',
      referencePaiement: '',
      notes: ''
    };
  }
}
