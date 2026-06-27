import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { DatasetAdapter } from '@app/features/discovery/adapters/dataset-adapter.interface';
import {
  MOCK_DATASETS,
  MOCK_TOPICS,
} from '@app/features/discovery/data/mock-datasets';
import {
  Dataset,
  DatasetFilters,
  DatasetMetadataUpdate,
  DatasetTopic,
} from '@app/features/discovery/models/dataset.model';

@Injectable()
export class MockDatasetAdapter implements DatasetAdapter {
  private datasets: Dataset[] = structuredClone(MOCK_DATASETS);
  private topics: DatasetTopic[] = structuredClone(MOCK_TOPICS);

  list(filters?: DatasetFilters): Observable<Dataset[]> {
    return of(this.applyFilters(structuredClone(this.datasets), filters));
  }

  getById(id: string): Observable<Dataset> {
    const dataset = this.datasets.find((item) => item.id === id);
    if (!dataset) {
      return throwError(() => new Error(`Dataset not found: ${id}`));
    }
    return of(structuredClone(dataset));
  }

  listTopics(): Observable<DatasetTopic[]> {
    return of(structuredClone(this.topics));
  }

  updateMetadata(
    id: string,
    metadata: DatasetMetadataUpdate,
  ): Observable<Dataset> {
    const topic = this.topics.find((item) => item.slug === metadata.topicSlug);
    const now = new Date().toISOString().slice(0, 10);
    const index = this.datasets.findIndex((dataset) => dataset.id === id);

    if (index < 0) {
      throw new Error(`Dataset not found: ${id}`);
    }

    const updated: Dataset = {
      ...this.datasets[index],
      ...metadata,
      topicName: topic?.name ?? this.datasets[index].topicName,
      updatedAt: now,
      updateHistory: [
        { date: now, note: 'Metadata updated by admin' },
        ...this.datasets[index].updateHistory,
      ].slice(0, 6),
    };

    this.datasets = this.datasets.map((dataset) =>
      dataset.id === id ? updated : dataset,
    );

    return of(structuredClone(updated));
  }

  private applyFilters(
    datasets: Dataset[],
    filters?: DatasetFilters,
  ): Dataset[] {
    if (!filters) {
      return datasets;
    }

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
