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
import {
  ExploreChartType,
  ExploreIndicator,
} from '@app/features/explore/models/explore.model';
import { ensureChartJsRegistered } from '@app/features/explore/utils/chart-js.util';
import {
  CHART_COLORS,
  chartAxisTicksColor,
  chartGridColor,
  chartLegendOptions,
  chartTooltipOptions,
} from '@app/features/explore/utils/chart-colors.util';

@Component({
  selector: 'app-indicator-chart',
  standalone: true,
  templateUrl: './indicator-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndicatorChartComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly indicator = input.required<ExploreIndicator>();
  readonly chartType = input<ExploreChartType>('line');

  protected readonly chartAriaLabel = computed(
    () => `${this.indicator().name} trend chart`,
  );

  protected readonly chartSummary = computed(() => {
    const indicator = this.indicator();
    const latest = indicator.timeSeries.at(-1);
    if (!latest) {
      return `${indicator.name} trend data.`;
    }
    return `${indicator.name} trend chart. Latest value ${latest.label}: ${latest.value} ${indicator.unit}.`;
  });

  private readonly canvasRef =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private chart: ChartInstance | null = null;
  private viewReady = false;

  constructor() {
    effect(() => {
      const indicator = this.indicator();
      const type = this.chartType();
      if (this.viewReady && indicator) {
        this.renderChart(indicator, type);
      }
    });

    this.destroyRef.onDestroy(() => this.destroyChart());
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderChart(this.indicator(), this.chartType());
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvasRef()?.nativeElement ?? null;
  }

  private renderChart(
    indicator: ExploreIndicator,
    type: ExploreChartType,
  ): void {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ensureChartJsRegistered();
    this.destroyChart();

    const labels = indicator.timeSeries.map((p) => p.label);
    const values = indicator.timeSeries.map((p) => p.value);

    const config: ChartConfiguration = {
      type: type === 'line' ? 'line' : 'bar',
      data: {
        labels,
        datasets: [
          {
            label: `${indicator.name} (${indicator.unit})`,
            data: values,
            borderColor: CHART_COLORS.primary,
            backgroundColor:
              type === 'line' ? CHART_COLORS.primarySoft : CHART_COLORS.primary,
            fill: type === 'line',
            tension: 0.3,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            ...chartLegendOptions(),
            display: true,
            position: 'top',
          },
          tooltip: {
            ...chartTooltipOptions(),
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          x: {
            ticks: { color: chartAxisTicksColor() },
            grid: { color: chartGridColor() },
          },
          y: {
            beginAtZero: type === 'bar',
            ticks: { color: chartAxisTicksColor() },
            grid: { color: chartGridColor() },
            title: {
              display: true,
              text: indicator.unit,
              color: CHART_COLORS.muted,
            },
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
