import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ForecastService,
  ForecastSummary,
  RevenueForecast,
  ServiceForecast,
  MonthlyPrediction,
  HistoricalMonthly,
} from '../../services/forecast.service';

@Component({
  selector: 'app-forecasting',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './forecasting.component.html',
  styleUrl: './forecasting.component.css'
})
export class ForecastingComponent implements OnInit {

  // ── State ──
  isLoading = true;
  isRefreshing = false;
  errorMsg = '';
  successMsg = '';

  // ── Data ──
  summary: ForecastSummary | null = null;
  revenue: RevenueForecast | null = null;
  services: ServiceForecast[] = [];
  monthlyPredictions: MonthlyPrediction[] = [];
  historicalMonthly: HistoricalMonthly[] = [];

  // ── Chart helpers ──
  maxBarValue = 0;
  chartData: { label: string; value: number; type: 'historical' | 'predicted' }[] = [];

  // ── Donut ──
  donutSegments: { service: string; label: string; proportion: number; color: string }[] = [];
  readonly serviceColors: Record<string, string> = {
    'MOBILE_TERRESTRE': '#4F46E5',
    'FIXE': '#F43F5E',
    'RADIODIFFUSION': '#06B6D4',
    'MARITIME': '#059669',
    'MOBILE_AERONAUTIQUE': '#EA580C',
    'AMATEUR': '#8B5CF6',
    'SATELLITE': '#D97706',
    'AUTRE': '#64748B',
  };

  constructor(private forecastService: ForecastService) {}

  ngOnInit(): void {
    this.loadForecast();
  }

  loadForecast(): void {
    this.isLoading = true;
    this.errorMsg = '';
    this.forecastService.getSummary().subscribe({
      next: (data) => {
        this.summary = data;
        this.revenue = data.revenue;
        this.services = data.byService || [];
        this.monthlyPredictions = data.revenue?.monthlyPredictions || [];
        this.historicalMonthly = data.historicalMonthly || [];
        this.buildChartData();
        this.buildDonutData();
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err.status === 0
          ? 'Le service de prévisions IA est inaccessible. Lancez le serveur Python (port 8000).'
          : `Erreur ${err.status}: ${err.error?.detail || 'Échec du chargement des prévisions.'}`;
      }
    });
  }

  refreshModel(): void {
    this.isRefreshing = true;
    this.successMsg = '';
    this.errorMsg = '';
    this.forecastService.refreshModel().subscribe({
      next: (res) => {
        this.summary = res.data;
        this.revenue = res.data?.revenue;
        this.services = res.data?.byService || [];
        this.monthlyPredictions = res.data?.revenue?.monthlyPredictions || [];
        this.historicalMonthly = res.data?.historicalMonthly || [];
        this.buildChartData();
        this.buildDonutData();
        this.isRefreshing = false;
        this.successMsg = 'Modèle réentraîné avec succès !';
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: () => {
        this.isRefreshing = false;
        this.errorMsg = 'Erreur lors du réentraînement du modèle.';
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CHART DATA
  // ═══════════════════════════════════════════════════════════════

  buildChartData(): void {
    this.chartData = [];

    // Last 6 months of historical data
    const recent = this.historicalMonthly.slice(-6);
    for (const m of recent) {
      this.chartData.push({
        label: this.shortMonth(m.monthLabel),
        value: m.revenue,
        type: 'historical',
      });
    }

    // Next 12 months of predictions
    for (const p of this.monthlyPredictions) {
      this.chartData.push({
        label: this.shortMonth(p.monthLabel),
        value: p.predicted,
        type: 'predicted',
      });
    }

    this.maxBarValue = Math.max(...this.chartData.map(d => d.value), 1);
  }

  getBarHeight(value: number): string {
    const pct = (value / this.maxBarValue) * 100;
    return `${Math.max(pct, 2)}%`;
  }

  shortMonth(label: string): string {
    // "Jan 2027" → "Jan 27" or "Jan 2027" → "Jan"
    const parts = label.split(' ');
    if (parts.length === 2) {
      return parts[0] + ' ' + parts[1].slice(-2);
    }
    return label;
  }

  // ═══════════════════════════════════════════════════════════════
  // DONUT DATA
  // ═══════════════════════════════════════════════════════════════

  buildDonutData(): void {
    this.donutSegments = this.services.map(s => ({
      service: s.service,
      label: s.label,
      proportion: s.proportion,
      color: this.serviceColors[s.service] || '#94A3B8',
    }));
  }

  getDonutGradient(): string {
    if (this.donutSegments.length === 0) {
      return 'conic-gradient(#E2E8F0 0% 100%)';
    }
    let cumulative = 0;
    const stops: string[] = [];
    for (const seg of this.donutSegments) {
      const start = cumulative;
      cumulative += seg.proportion;
      stops.push(`${seg.color} ${start}% ${cumulative}%`);
    }
    return `conic-gradient(${stops.join(', ')})`;
  }

  // ═══════════════════════════════════════════════════════════════
  // FORMATTERS
  // ═══════════════════════════════════════════════════════════════

  formatCurrency(value: number): string {
    if (value >= 1_000_000) {
      return (value / 1_000_000).toFixed(2) + 'M';
    }
    if (value >= 1_000) {
      return (value / 1_000).toFixed(1) + 'K';
    }
    return value.toFixed(0);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  getGrowthClass(): string {
    if (!this.revenue) return '';
    return this.revenue.growthRate >= 0 ? 'positive' : 'negative';
  }

  getGrowthIcon(): string {
    if (!this.revenue) return '';
    return this.revenue.growthRate >= 0 ? '↑' : '↓';
  }

  getConfidenceClass(): string {
    if (!this.revenue) return '';
    if (this.revenue.confidenceScore >= 80) return 'confidence-high';
    if (this.revenue.confidenceScore >= 50) return 'confidence-medium';
    return 'confidence-low';
  }

  getTrainedTimeAgo(): string {
    if (!this.revenue?.trainedAt) return '';
    const trained = new Date(this.revenue.trainedAt);
    const now = new Date();
    const diffMs = now.getTime() - trained.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'À l\'instant';
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    return `Il y a ${diffH}h`;
  }
}
