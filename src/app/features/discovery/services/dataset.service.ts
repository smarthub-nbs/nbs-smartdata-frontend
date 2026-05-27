import { Injectable, computed, signal } from '@angular/core';
import {
  MOCK_DATASETS,
  MOCK_TOPICS,
} from '@app/features/discovery/data/mock-datasets';
import {
  Dataset,
  DatasetFilters,
  DatasetMetadataUpdate,
  DatasetTopic,
  EMPTY_DATASET_FILTERS,
} from '@app/features/discovery/models/dataset.model';

@Injectable({ providedIn: 'root' })
export class DatasetService {
  private readonly datasets = signal<Dataset[]>(MOCK_DATASETS);
  private readonly filters = signal<DatasetFilters>({
    ...EMPTY_DATASET_FILTERS,
  });

  readonly topics = signal<DatasetTopic[]>(MOCK_TOPICS);
  readonly activeFilters = this.filters.asReadonly();

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

  setFilters(partial: Partial<DatasetFilters>): void {
    this.filters.update((current) => ({ ...current, ...partial }));
  }

  resetFilters(): void {
    this.filters.set({ ...EMPTY_DATASET_FILTERS });
  }

  listDatasets(): Dataset[] {
    return this.datasets();
  }

  getById(id: string): Dataset | undefined {
    return this.datasets().find((d) => d.id === id);
  }

  updateMetadata(id: string, metadata: DatasetMetadataUpdate): void {
    const topic = this.topics().find(
      (item) => item.slug === metadata.topicSlug,
    );
    const now = new Date().toISOString().slice(0, 10);

    this.datasets.update((items) =>
      items.map((dataset) => {
        if (dataset.id !== id) {
          return dataset;
        }

        return {
          ...dataset,
          ...metadata,
          topicName: topic?.name ?? dataset.topicName,
          updatedAt: now,
          updateHistory: [
            {
              date: now,
              note: 'Metadata updated by admin',
            },
            ...dataset.updateHistory,
          ].slice(0, 6),
        };
      }),
    );
  }

  getTopic(slug: string): DatasetTopic | undefined {
    return this.topics().find((t) => t.slug === slug);
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
