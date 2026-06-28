import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '@app/core/models/api-error.model';
import { INDICATOR_ADAPTER } from '@app/features/explore/adapters/indicator.adapter';
import {
  ExploreChartType,
  ExploreIndicator,
} from '@app/features/explore/models/explore.model';
import {
  AsyncState,
  errorState,
  loadingState,
  successState,
} from '@app/shared/models/async-state.model';

@Injectable({ providedIn: 'root' })
export class ExploreDataService {
  private readonly adapter = inject(INDICATOR_ADAPTER);
  private readonly destroyRef = inject(DestroyRef);

  private readonly indicators = signal<ExploreIndicator[]>([]);
  private readonly catalogState =
    signal<AsyncState<ExploreIndicator[]>>(loadingState());

  readonly allIndicators = this.indicators.asReadonly();
  readonly catalogLoadState = this.catalogState.asReadonly();

  constructor() {
    this.loadIndicators();
  }

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

  refreshIndicators(): void {
    this.loadIndicators();
  }

  private loadIndicators(): void {
    this.catalogState.set(loadingState());

    this.adapter
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.indicators.set(items);
          this.catalogState.set(successState(items));
        },
        error: (error: unknown) => {
          this.catalogState.set(
            errorState(
              this.resolveErrorMessage(error, 'Failed to load indicators.'),
            ),
          );
        },
      });
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return fallback;
  }
}
