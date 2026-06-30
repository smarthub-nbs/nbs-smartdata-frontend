import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { Chart, ChartConfiguration, Chart as ChartInstance } from 'chart.js';
import { ExploreIndicator } from '@app/features/explore/models/explore.model';
import { ensureChartJsRegistered } from '@app/features/explore/utils/chart-js.util';

const CHART_ACCENT = '#0d9488';

@Component({
  selector: 'app-regional-comparison-chart',
  standalone: true,
  templateUrl: './regional-comparison-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegionalComparisonChartComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly indicator = input.required<ExploreIndicator>();

  protected readonly chartAriaLabel = computed(
    () => `${this.indicator().name} regional comparison chart`,
  );

  protected readonly chartSummary = computed(() => {
    const indicator = this.indicator();
    const top = [...indicator.regional].sort((a, b) => b.value - a.value)[0];
    if (!top) {
      return `${indicator.name} regional comparison.`;
    }
    return `${indicator.name} regional comparison. Highest region ${top.region}: ${top.value} ${indicator.unit}.`;
  });

  private readonly canvasRef =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private chart: ChartInstance | null = null;
  private viewReady = false;

  constructor() {
    effect(() => {
      const indicator = this.indicator();
      if (this.viewReady && indicator) {
        this.renderChart(indicator);
      }
    });

    this.destroyRef.onDestroy(() => this.destroyChart());
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderChart(this.indicator());
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvasRef()?.nativeElement ?? null;
  }

  private renderChart(indicator: ExploreIndicator): void {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ensureChartJsRegistered();
    this.destroyChart();

    const sorted = [...indicator.regional].sort((a, b) => b.value - a.value);
    const labels = sorted.map((r) => r.region);
    const values = sorted.map((r) => r.value);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: `${indicator.name} by region (${indicator.unit})`,
            data: values,
            backgroundColor: CHART_ACCENT,
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            title: { display: true, text: indicator.unit },
          },
        },
      },
    };

    this.chart = new Chart(ctx, config);
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
