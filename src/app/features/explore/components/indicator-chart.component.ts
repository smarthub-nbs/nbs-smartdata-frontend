import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  Chart,
  ChartConfiguration,
  Chart as ChartInstance,
  registerables,
} from 'chart.js';
import {
  ExploreChartType,
  ExploreIndicator,
} from '@app/features/explore/models/explore.model';

Chart.register(...registerables);

@Component({
  selector: 'app-indicator-chart',
  standalone: true,
  template: `
    <div class="relative h-72 w-full sm:h-80">
      <canvas #canvas aria-label="Indicator trend chart"></canvas>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndicatorChartComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly indicator = input.required<ExploreIndicator>();
  readonly chartType = input<ExploreChartType>('line');

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
            borderColor: '#0066cc',
            backgroundColor:
              type === 'line' ? 'rgba(0, 102, 204, 0.15)' : '#0066cc',
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
          legend: { display: true, position: 'top' },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          y: {
            beginAtZero: type === 'bar',
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
