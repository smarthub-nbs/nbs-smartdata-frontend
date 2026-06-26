import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { DatasetAdapter } from '@app/features/discovery/adapters/dataset-adapter.interface';
import {
  Dataset,
  DatasetMetadataUpdate,
  DatasetFrequency,
  DatasetFormat,
  DatasetTopic,
} from '@app/features/discovery/models/dataset.model';

interface BackendCategory {
  id: string;
  name: string;
  slug: string;
}

interface BackendDatasetMetadata {
  title: string;
  description: string;
  license: string;
  frequency: string;
  region: string;
  year: number | null;
  publisher_name: string;
}

interface BackendDatasetFile {
  file_format: string;
}

interface BackendDatasetVersion {
  created_by?: string | null;
  files?: BackendDatasetFile[];
}

interface BackendDataset {
  id: string;
  slug: string;
  category: BackendCategory | null;
  metadata?: BackendDatasetMetadata[];
  versions?: BackendDatasetVersion[];
  published_at: string | null;
}

@Injectable()
export class HttpDatasetAdapter implements DatasetAdapter {
  private readonly api = inject(ApiService);

  list(): Observable<Dataset[]> {
    return this.api.get<BackendDataset[]>('/v1/dataset/').pipe(
      switchMap((datasets) => {
        if (datasets.length === 0) {
          return of([]);
        }

        return forkJoin(
          datasets.map((dataset) =>
            this.api.get<BackendDataset>(`/v1/dataset/${dataset.id}/`),
          ),
        );
      }),
      map((datasets) => datasets.map((dataset) => this.toDataset(dataset))),
    );
  }

  listTopics(): Observable<DatasetTopic[]> {
    return this.api.get<BackendCategory[]>('/v1/dataset/categories/').pipe(
      map((categories) =>
        categories.map((category) => ({
          slug: category.slug,
          name: category.name,
          description: `${category.name} datasets`,
          datasetCount: 0,
        })),
      ),
    );
  }

  updateMetadata(
    id: string,
    metadata: DatasetMetadataUpdate,
  ): Observable<Dataset> {
    return this.api
      .patch<BackendDataset>(`/v1/dataset/${id}/`, {
        category: metadata.topicSlug,
      })
      .pipe(map((dataset) => this.toDataset(dataset)));
  }

  private toDataset(dataset: BackendDataset): Dataset {
    const metadata = dataset.metadata?.[0];
    const topic = dataset.category;

    return {
      id: dataset.id,
      title: metadata?.title ?? dataset.slug,
      description: metadata?.description ?? 'No description available.',
      topicSlug: topic?.slug ?? 'uncategorized',
      topicName: topic?.name ?? 'Uncategorized',
      format: this.resolveFormat(dataset),
      frequency: this.resolveFrequency(metadata?.frequency),
      region: metadata?.region ?? 'National',
      keywords: [dataset.slug, topic?.slug].filter((value): value is string =>
        Boolean(value),
      ),
      publisher: metadata?.publisher_name ?? 'NBS',
      updatedAt: dataset.published_at ?? new Date().toISOString(),
      qualityScore: 80,
      recordCount: dataset.versions?.length ?? 0,
      license: metadata?.license ?? 'Open Government Licence - Tanzania',
      updateHistory: [
        {
          date: dataset.published_at ?? new Date().toISOString(),
          note: 'Published',
        },
      ],
    };
  }

  private resolveFormat(dataset: BackendDataset): DatasetFormat {
    const fileFormat = dataset.versions
      ?.flatMap((version) => version.files ?? [])
      .map((file) => file.file_format.toUpperCase())
      .find((format) => ['CSV', 'XLSX', 'JSON', 'SDMX'].includes(format)) as
      | DatasetFormat
      | undefined;

    return fileFormat ?? 'CSV';
  }

  private resolveFrequency(frequency: string | undefined): DatasetFrequency {
    switch (frequency) {
      case 'quarterly':
        return 'Quarterly';
      case 'monthly':
        return 'Monthly';
      default:
        return 'Annual';
    }
  }
}
