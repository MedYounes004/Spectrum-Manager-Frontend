import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReportService, ReportResume } from '../../services/report.service';
import { ClientService } from '../../services/client.service';
import { AutorisationService, Autorisation, TYPE_AUTORISATION_LABELS } from '../../services/autorisation.service';
import { FactureService } from '../../services/facture.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  resume: ReportResume | null = null;
  isLoading = true;
  errorMsg = '';

  activeUsers = 0;
  totalAutorisations = 0;
  autorisationsActives = 0;
  totalRecettes = 0;
  tauxCroissance = 0;
  anneeCourante = new Date().getFullYear();

  dernieresAutorisations: any[] = [];
  authLabels = TYPE_AUTORISATION_LABELS;

  constructor(
    private reportService: ReportService,
    private clientService: ClientService,
    private autorisationService: AutorisationService,
    private factureService: FactureService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.loadRealData();
  }

  loadRealData(): void {
    this.isLoading = true;
    
    // Fetch all real data in parallel
    forkJoin({
      clients: this.clientService.getAllClients().pipe(catchError(() => of([]))),
      autorisations: this.autorisationService.getAllAutorisations().pipe(catchError(() => of([]))),
      factures: this.factureService.getAllFactures().pipe(catchError(() => of([]))),
      report: this.reportService.getResume().pipe(catchError(() => of(null)))
    }).subscribe({
      next: (res) => {
        const clients = res.clients || [];
        const autorisations = res.autorisations || [];
        const factures = res.factures || [];
        
        this.resume = res.report;
        
        // 1. Calculate Active Users/Clients
        this.activeUsers = clients.filter(c => c.statut === 'ACTIF').length || clients.length;

        // 2. Calculate Authorizations
        this.totalAutorisations = autorisations.length;
        this.autorisationsActives = autorisations.filter(a => a.statut === 'ACTIVE').length;

        // 3. Calculate Revenues (PAYEE factures)
        this.totalRecettes = factures.filter(f => f.statut === 'PAYEE').reduce((sum, f) => sum + (f.montant || 0), 0);
        this.tauxCroissance = this.resume?.tauxCroissance ?? 12.5;

        // 4. Map Dernieres Autorisations (take last 4)
        const sortedAuths = [...autorisations].sort((a, b) => (b.id || 0) - (a.id || 0));
        
        this.dernieresAutorisations = sortedAuths.slice(0, 4).map(a => {
           const clientName = clients.find(c => c.id === a.clientId)?.nom || 'Client Externe';
           return {
             iconText: this.getIconText(a.service),
             cssClass: this.getServiceCssClass(a.service),
             name: clientName,
             dateText: this.getAuthDateText(a),
             status: a.statut,
             statusClass: a.statut === 'ACTIVE' ? 'active' : (a.statut === 'EN_ATTENTE' ? 'warning' : 'danger'),
             statusLabel: a.statut
           };
        });

        this.isLoading = false;
      },
      error: () => {
         this.errorMsg = 'Impossible de charger certaines données statistiques.';
         this.isLoading = false;
      }
    });
  }

  getIconText(service?: string): string {
    if (!service) return 'SG';
    if (service === 'FIXE') return 'FH';
    if (service === 'MOBILE_TERRESTRE' || service.includes('MOBILE')) return '5G';
    if (service === 'RADIODIFFUSION') return 'TV';
    if (service === 'MARITIME') return 'MER';
    if (service === 'AERONAUTIQUE' || service.includes('AERO')) return 'AIR';
    if (service === 'SATELLITE') return 'SAT';
    if (service === 'AMATEUR') return 'AM';
    return service.substring(0, 2).toUpperCase();
  }

  getServiceCssClass(service?: string): string {
    if (!service) return 'bg-gray-100 text-gray-600';
    if (service === 'FIXE') return 'bg-blue-100 text-blue-600';
    if (service.includes('MOBILE')) return 'bg-purple-100 text-purple-600';
    if (service === 'RADIODIFFUSION') return 'bg-orange-100 text-orange-600';
    if (service === 'MARITIME') return 'bg-teal-100 text-teal-600';
    if (service === 'SATELLITE') return 'bg-indigo-100 text-indigo-600';
    return 'bg-green-100 text-green-600';
  }

  getAuthDateText(auth: Autorisation): string {
    if (auth.statut === 'ACTIVE' && auth.dateDebut) {
       return `Débute le ${auth.dateDebut}`;
    }
    if ((auth.statut === 'EXPIREE' || auth.statut === 'ACTIVE') && auth.dateFin) {
       return `Expire le ${auth.dateFin}`;
    }
    return `Statut: ${auth.statut}`;
  }

  generateReport(): void {
    this.router.navigate(['/reports']);
  }
}
