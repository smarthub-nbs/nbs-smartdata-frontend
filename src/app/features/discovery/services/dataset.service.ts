import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin, Observable, tap } from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import { DATASET_ADAPTER } from '@app/features/discovery/adapters/dataset.adapter';
import {
  Dataset,
  DatasetFilters,
  DatasetMetadataUpdate,
  DatasetTopic,
  EMPTY_DATASET_FILTERS,
} from '@app/features/discovery/models/dataset.model';
import {
  AsyncState,
  errorState,
  loadingState,
  successState,
} from '@app/shared/models/async-state.model';

@Injectable({ providedIn: 'root' })
export class DatasetService {
  private readonly adapter = inject(DATASET_ADAPTER);

  private readonly datasets = signal<Dataset[]>([]);
  private readonly topicsState = signal<DatasetTopic[]>([]);
  private readonly filters = signal<DatasetFilters>({
    ...EMPTY_DATASET_FILTERS,
  });
  private readonly catalogState = signal<AsyncState<Dataset[]>>(loadingState());

  readonly topics = this.topicsState.asReadonly();
  readonly activeFilters = this.filters.asReadonly();
  readonly catalogLoadState = this.catalogState.asReadonly();

  readonly filteredDatasets = computed(() =>
    this.applyFilters(this.datasets(), this.filters()),
  );

  readonly regions = computed(() => [
    ...new Set(this.datasets().map((d) => d.region)),
  ]);

  readonly formats = computed(() => [
    ...new Set(this.datasets().map((d) => d.format)),
  ]);

  readonly frequencies = computed(() => [
    ...new Set(this.datasets().map((d) => d.frequency)),
  ]);

  constructor() {
    this.loadCatalog();
  }

  setFilters(partial: Partial<DatasetFilters>): void {
    this.filters.update((current) => ({ ...current, ...partial }));
  }

  resetFilters(): void {
    this.filters.set({ ...EMPTY_DATASET_FILTERS });
  }

  listDatasets(): Dataset[] {
    return this.datasets();
  }

  /** Stable slice for demos, seeds, and previews without exposing mutable state. */
  getSnapshot(limit?: number): Dataset[] {
    const all = this.datasets();
    if (limit === undefined) {
      return [...all];
    }
    return all.slice(0, Math.max(0, limit));
  }

  listByIds(ids: string[]): Dataset[] {
    const byId = new Map(
      this.datasets().map((dataset) => [dataset.id, dataset]),
    );
    return ids
      .map((id) => byId.get(id))
      .filter((dataset): dataset is Dataset => dataset !== undefined);
  }

  getById(id: string): Dataset | undefined {
    return this.datasets().find((d) => d.id === id);
  }

  updateMetadata(
    id: string,
    metadata: DatasetMetadataUpdate,
  ): Observable<Dataset> {
    return this.adapter.updateMetadata(id, metadata).pipe(
      tap((updated) => {
        this.datasets.update((items) =>
          items.map((dataset) => (dataset.id === id ? updated : dataset)),
        );
        if (this.catalogState().status === 'success') {
          this.catalogState.set(successState(this.datasets()));
        }
      }),
    );
  }

  getTopic(slug: string): DatasetTopic | undefined {
    return this.topicsState().find((t) => t.slug === slug);
  }

  getTopics(): DatasetTopic[] {
    return this.topicsState();
  }

  getByTopic(slug: string): Dataset[] {
    return this.datasets().filter((d) => d.topicSlug === slug);
  }

  search(query: string): Dataset[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }
    return this.datasets().filter((dataset) => {
      const haystack = [
        dataset.title,
        dataset.description,
        dataset.topicName,
        dataset.region,
        ...dataset.keywords,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }

  refreshCatalog(): void {
    this.loadCatalog();
  }

  private loadCatalog(): void {
    this.catalogState.set(loadingState());

    forkJoin({
      datasets: this.adapter.list(),
      topics: this.adapter.listTopics(),
    }).subscribe({
      next: ({ datasets, topics }) => {
        this.datasets.set(datasets);
        this.topicsState.set(topics);
        this.catalogState.set(successState(datasets));
      },
      error: (error: unknown) => {
        this.catalogState.set(
          errorState(
            this.resolveErrorMessage(error, 'Failed to load datasets.'),
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

  private applyFilters(
    datasets: Dataset[],
    filters: DatasetFilters,
  ): Dataset[] {
    const query = filters.query.trim().toLowerCase();

    return datasets.filter((dataset) => {
      if (filters.topicSlug && dataset.topicSlug !== filters.topicSlug) {
        return false;
      }
      if (filters.format && dataset.format !== filters.format) {
        return false;
      }
      if (filters.frequency && dataset.frequency !== filters.frequency) {
        return false;
      }
      if (filters.region && dataset.region !== filters.region) {
        return false;
      }
      if (query) {
        const haystack = [
          dataset.title,
          dataset.description,
          dataset.topicName,
          dataset.region,
          ...dataset.keywords,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }
}
