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
import { Chart, ChartConfiguration, Chart as ChartInstance } from 'chart.js';
import { ExploreIndicator } from '@app/features/explore/models/explore.model';

@Component({
  selector: 'app-regional-comparison-chart',
  standalone: true,
  template: `
    <div class="relative h-80 w-full">
      <canvas #canvas aria-label="Regional comparison chart"></canvas>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegionalComparisonChartComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly indicator = input.required<ExploreIndicator>();

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
            backgroundColor: '#0d9488',
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
