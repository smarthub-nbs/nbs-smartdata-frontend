import { Injectable, signal } from '@angular/core';
import { MOCK_INDICATORS } from '@app/features/explore/data/mock-indicators';
import {
  ExploreChartType,
  ExploreIndicator,
} from '@app/features/explore/models/explore.model';

@Injectable({ providedIn: 'root' })
export class ExploreDataService {
  private readonly indicators = signal<ExploreIndicator[]>(MOCK_INDICATORS);

  readonly allIndicators = this.indicators.asReadonly();

  getIndicator(id: string): ExploreIndicator | undefined {
    return this.indicators().find((i) => i.id === id);
  }

  getDefaultIndicatorId(): string {
    return this.indicators()[0]?.id ?? '';
  }

  getRegionalMax(indicator: ExploreIndicator): number {
    return Math.max(...indicator.regional.map((r) => r.value), 1);
  }

  formatValue(value: number, unit: string): string {
    return `${value.toFixed(1)}${unit === '%' ? '%' : ` ${unit}`}`;
  }

  chartTypeLabel(type: ExploreChartType): string {
    return type === 'line' ? 'Trend (line)' : 'Trend (bar)';
  }
}
