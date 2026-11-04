import { Component, OnInit } from '@angular/core';
import { CommonModule, KeyValue } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ReportService,
  BilanAnnuelDTO,
  RapportActiviteDTO,
  ReportResume
} from '../../services/report.service';
import { TYPE_AUTORISATION_LABELS } from '../../services/autorisation.service';
import { TYPE_FACTURE_LABELS } from '../../services/facture.service';

type ReportTab = 'bilan' | 'activite';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit {
  activeTab: ReportTab = 'bilan';

  resume: ReportResume | null = null;
  bilan: BilanAnnuelDTO | null = null;
  activite: RapportActiviteDTO | null = null;

  selectedYear = new Date().getFullYear();
  yearOptions: number[] = [];

  dateDebut = `${new Date().getFullYear()}-01-01`;
  dateFin = new Date().toISOString().split('T')[0];

  isLoading = true;
  isLoadingBilan = false;
  isLoadingActivite = false;
  errorMsg = '';

  readonly typeAutorisationLabels: Record<string, string> = TYPE_AUTORISATION_LABELS;
  readonly typeFactureLabels: Record<string, string> = TYPE_FACTURE_LABELS;

  constructor(private reportService: ReportService) {}

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    this.yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);
    this.loadResume();
    this.loadBilan();
  }

  switchTab(tab: ReportTab): void {
    this.activeTab = tab;
    if (tab === 'activite' && !this.activite) {
      this.loadActivite();
    }
  }

  loadResume(): void {
    this.reportService.getResume().subscribe({
      next: (data) => {
        this.resume = data;
      },
      error: () => {
        this.resume = null;
      }
    });
  }

  loadBilan(): void {
    this.isLoadingBilan = true;
    this.errorMsg = '';

    const request$ = this.selectedYear === new Date().getFullYear()
      ? this.reportService.getBilanAnneeCourante()
      : this.reportService.getBilanAnnuel(this.selectedYear);

    request$.subscribe({
      next: (data) => {
        this.bilan = data;
        this.isLoading = false;
        this.isLoadingBilan = false;
      },
      error: (err) => {
        this.errorMsg = err.status === 0
          ? 'Impossible de joindre le service de reporting. Vérifiez que la passerelle et le reporting-service sont démarrés.'
          : `Erreur ${err.status}: échec du chargement du bilan annuel.`;
        this.isLoading = false;
        this.isLoadingBilan = false;
      }
    });
  }

  loadActivite(): void {
    if (!this.dateDebut || !this.dateFin) {
      this.errorMsg = 'Veuillez sélectionner une période valide.';
      return;
    }

    if (this.dateDebut > this.dateFin) {
      this.errorMsg = 'La date de début doit être antérieure à la date de fin.';
      return;
    }

    this.isLoadingActivite = true;
    this.errorMsg = '';

    this.reportService.getRapportActivite(this.dateDebut, this.dateFin).subscribe({
      next: (data) => {
        this.activite = data;
        this.isLoadingActivite = false;
      },
      error: (err) => {
        this.errorMsg = err.status === 0
          ? 'Impossible de joindre le service de reporting.'
          : `Erreur ${err.status}: échec du chargement du rapport d'activité.`;
        this.isLoadingActivite = false;
      }
    });
  }

  onYearChange(): void {
    this.loadBilan();
  }

  refreshAll(): void {
    this.isLoading = true;
    this.loadResume();
    this.loadBilan();
    if (this.activeTab === 'activite') {
      this.loadActivite();
    }
  }

  getTypeLabel(type: string, category: 'auth' | 'facture' = 'auth'): string {
    const labels = category === 'facture' ? this.typeFactureLabels : this.typeAutorisationLabels;
    return labels[type] ?? type;
  }

  getBarWidth(value: number, data: Record<string, number>): number {
    const max = Math.max(...Object.values(data), 1);
    return Math.round((value / max) * 100);
  }

  getCollectionRate(): number {
    if (!this.activite || !this.activite.montantTotal) return 0;
    return Math.round((this.activite.montantPercu / this.activite.montantTotal) * 100);
  }

  getApprovalRate(): number {
    if (!this.activite || !this.activite.totalDemandes) return 0;
    return Math.round((this.activite.demandesApprouvees / this.activite.totalDemandes) * 100);
  }

  exportBilanCsv(): void {
    if (!this.bilan) return;

    const rows = [
      ['Indicateur', 'Valeur'],
      ['Année', String(this.bilan.annee)],
      ['Total autorisations', String(this.bilan.totalAutorisations)],
      ['Autorisations actives', String(this.bilan.autorisationsActives)],
      ['Autorisations expirées', String(this.bilan.autorisationsExpirees)],
      ['En attente', String(this.bilan.autorisationsEnAttente)],
      ['Nouvelles autorisations', String(this.bilan.nouvellesAutorisations)],
      ['Total recettes (TND)', this.bilan.totalRecettes.toFixed(2)],
      ['Taux de croissance (%)', this.bilan.tauxCroissance.toFixed(2)],
      [''],
      ['Autorisations par type', 'Nombre'],
      ...Object.entries(this.bilan.autorisationsParType).map(([k, v]) => [this.getTypeLabel(k), String(v)]),
      [''],
      ['Recettes par type', 'Montant (TND)'],
      ...Object.entries(this.bilan.recettesParType).map(([k, v]) => [this.getTypeLabel(k, 'facture'), v.toFixed(2)])
    ];

    this.downloadCsv(rows, `bilan_annuel_${this.bilan.annee}`);
  }

  exportActiviteCsv(): void {
    if (!this.activite) return;

    const rows = [
      ['Indicateur', 'Valeur'],
      ['Période', `${this.activite.dateDebut} → ${this.activite.dateFin}`],
      ['Total demandes', String(this.activite.totalDemandes)],
      ['Demandes approuvées', String(this.activite.demandesApprouvees)],
      ['Demandes refusées', String(this.activite.demandesRefusees)],
      ['Demandes en attente', String(this.activite.demandesEnAttente)],
      ['Montant total (TND)', this.activite.montantTotal.toFixed(2)],
      ['Montant perçu (TND)', this.activite.montantPercu.toFixed(2)],
      [''],
      ['Recettes par mois', 'Montant (TND)'],
      ...Object.entries(this.activite.recettesParMois).map(([k, v]) => [k, v.toFixed(2)]),
      [''],
      ['Demandes par type', 'Nombre'],
      ...Object.entries(this.activite.demandesParType).map(([k, v]) => [this.getTypeLabel(k), String(v)])
    ];

    this.downloadCsv(rows, `rapport_activite_${this.activite.dateDebut}_${this.activite.dateFin}`);
  }

  sortByValueDesc = (a: KeyValue<string, number>, b: KeyValue<string, number>): number => {
    return b.value - a.value;
  };

  private downloadCsv(rows: string[][], filename: string): void {
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF'
      + rows.map(row => row.join(';')).join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
