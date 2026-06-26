import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DatasetAdapter } from '@app/features/discovery/adapters/dataset-adapter.interface';
import {
  MOCK_DATASETS,
  MOCK_TOPICS,
} from '@app/features/discovery/data/mock-datasets';
import {
  Dataset,
  DatasetMetadataUpdate,
  DatasetTopic,
} from '@app/features/discovery/models/dataset.model';

@Injectable()
export class MockDatasetAdapter implements DatasetAdapter {
  private datasets: Dataset[] = structuredClone(MOCK_DATASETS);
  private topics: DatasetTopic[] = structuredClone(MOCK_TOPICS);

  list(): Observable<Dataset[]> {
    return of(structuredClone(this.datasets));
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
}
