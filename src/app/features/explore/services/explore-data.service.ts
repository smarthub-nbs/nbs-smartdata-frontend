import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, map, of, switchMap } from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import { INDICATOR_ADAPTER } from '@app/features/explore/adapters/indicator.adapter';
import {
  ExploreChartType,
  ExploreIndicator,
  RegionalValue,
} from '@app/features/explore/models/explore.model';
import {
  GeoChartQuery,
  GeoFrame,
  GeoGrain,
  ValueField,
  censusPlaceQueries,
} from '@app/features/explore/utils/census-geo.util';
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
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }
    if (unit === 'data_value' || unit === 'datavalue' || unit === 'count') {
      return new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(
        value,
      );
    }
    return `${value.toFixed(1)}${unit ? ` ${unit}` : ''}`;
  }

  getPlaces(fileId: string, query: GeoChartQuery) {
    return this.adapter.getPlaces(fileId, query);
  }

  getCensusPlaces(
    fileId: string,
    frame: GeoFrame,
    yField: ValueField,
  ): Observable<{ rows: RegionalValue[]; grain: GeoGrain }> {
    const [primary, fallback] = censusPlaceQueries(frame, yField);
    return this.adapter.getPlaces(fileId, primary.query).pipe(
      switchMap((rows) => {
        if (rows.length > 0 || !fallback) {
          return of({ rows, grain: primary.grain });
        }
        return this.adapter.getPlaces(fileId, fallback.query).pipe(
          map((fallbackRows) => ({
            rows: fallbackRows,
            grain: fallback.grain,
          })),
        );
      }),
    );
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
