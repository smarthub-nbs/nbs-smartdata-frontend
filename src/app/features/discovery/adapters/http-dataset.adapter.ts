import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { DatasetAdapter } from '@app/features/discovery/adapters/dataset-adapter.interface';
import {
  Dataset,
  DatasetFilters,
  DatasetFrequency,
  DatasetFormat,
  DatasetTopic,
  DatasetWorkflowStatus,
} from '@app/features/discovery/models/dataset.model';

interface BackendCategory {
  id: string;
  name: string;
  slug: string;
}

interface BackendDatasetMetadata {
  id: string;
  title: string;
  description: string;
  license: string;
  frequency: string;
  region: string;
  year: number | null;
  publisher_name: string;
}

interface BackendDatasetFile {
  id: string;
  filename: string;
  file_format: string;
  is_primary: boolean;
}

interface BackendDatasetVersion {
  version_number: number | string;
  created_by?: string | null;
  files?: BackendDatasetFile[];
}

interface BackendTag {
  id: string;
  name: string;
  slug: string;
}

interface BackendDataset {
  id: string;
  slug: string;
  status?: string;
  category: BackendCategory | null;
  metadata?: BackendDatasetMetadata[];
  tags?: BackendTag[];
  versions?: BackendDatasetVersion[];
  published_at: string | null;
}

@Injectable()
export class HttpDatasetAdapter implements DatasetAdapter {
  private readonly api = inject(ApiService);

  list(filters?: DatasetFilters): Observable<Dataset[]> {
    const params = this.toListParams(filters);

    return this.api
      .get<BackendDataset[]>('/v1/dataset/', params)
      .pipe(map((items) => items.map((dataset) => this.toDataset(dataset))));
  }

  getById(id: string): Observable<Dataset> {
    return this.api
      .get<BackendDataset>(`/v1/dataset/${id}/`)
      .pipe(map((dataset) => this.toDataset(dataset)));
  }

  listTopics(): Observable<DatasetTopic[]> {
    return this.api.get<BackendCategory[]>('/v1/dataset/categories/').pipe(
      map((categories) =>
        categories.map((category) => ({
          id: category.id,
          slug: category.slug,
          name: category.name,
          description: `${category.name} datasets`,
          datasetCount: 0,
        })),
      ),
    );
  }

  private toListParams(
    filters?: DatasetFilters,
  ): Record<string, string> | undefined {
    if (!filters) {
      return undefined;
    }

    const params: Record<string, string> = {};
    const query = filters.query.trim();
    if (query) {
      params['q'] = query;
    }
    if (filters.topicSlug) {
      params['category'] = filters.topicSlug;
    }
    if (filters.region) {
      params['region'] = filters.region;
    }
    if (filters.frequency) {
      params['frequency'] = filters.frequency.toLowerCase();
    }
    if (filters.format) {
      params['file_format'] = filters.format.toLowerCase();
    }
    if (filters.tag) {
      params['tag'] = filters.tag;
    }
    if (filters.license) {
      params['license'] = filters.license;
    }
    if (filters.publisher) {
      params['publisher'] = filters.publisher;
    }
    if (filters.year) {
      params['year'] = filters.year;
    }

    return Object.keys(params).length > 0 ? params : undefined;
  }

  private toDataset(dataset: BackendDataset): Dataset {
    const metadata = this.resolveMetadata(dataset.metadata);
    const topic = dataset.category;

    return {
      id: dataset.id,
      metadataId: metadata?.id ?? null,
      primaryFileId: this.resolvePrimaryFileId(dataset),
      status: this.resolveStatus(dataset.status),
      year: metadata?.year ?? null,
      title: this.resolveDisplayTitle(metadata, dataset.slug),
      description: this.resolveDisplayDescription(metadata),
      topicSlug: topic?.slug ?? 'uncategorized',
      topicName: topic?.name ?? 'Uncategorized',
      format: this.resolveFormat(dataset),
      frequency: this.resolveFrequency(metadata?.frequency),
      region: metadata?.region?.trim() || 'National',
      keywords: this.resolveKeywords(dataset, topic?.slug),
      publisher: metadata?.publisher_name?.trim() || 'NBS',
      updatedAt: dataset.published_at ?? new Date().toISOString(),
      recordCount: 0,
      license:
        metadata?.license?.trim() || 'Open Government Licence - Tanzania',
    };
  }

  /** Prefer the newest metadata record that actually has discovery fields populated. */
  private resolveMetadata(
    records: BackendDatasetMetadata[] | undefined,
  ): BackendDatasetMetadata | undefined {
    if (!records?.length) {
      return undefined;
    }

    const withContent = records.filter(
      (record) => record.title?.trim() || record.description?.trim(),
    );
    const pool = withContent.length > 0 ? withContent : records;
    return pool.at(-1);
  }

  private resolveDisplayTitle(
    metadata: BackendDatasetMetadata | undefined,
    slug: string,
  ): string {
    const title = metadata?.title?.trim();
    if (title) {
      return title;
    }

    const fromSlug = slug
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    return fromSlug || 'Untitled dataset';
  }

  private resolveDisplayDescription(
    metadata: BackendDatasetMetadata | undefined,
  ): string {
    return metadata?.description?.trim() || 'No description available.';
  }

  private resolveStatus(status?: string): DatasetWorkflowStatus | undefined {
    if (
      status === 'draft' ||
      status === 'in_review' ||
      status === 'approved' ||
      status === 'rejected' ||
      status === 'published'
    ) {
      return status;
    }
    return undefined;
  }

  private resolveKeywords(
    dataset: BackendDataset,
    topicSlug?: string,
  ): string[] {
    const tagNames = dataset.tags?.map((tag) => tag.name) ?? [];
    if (tagNames.length > 0) {
      return tagNames;
    }
    return [dataset.slug, topicSlug].filter((value): value is string =>
      Boolean(value),
    );
  }

  private resolvePrimaryFileId(dataset: BackendDataset): string | null {
    const latestVersion = [...(dataset.versions ?? [])].sort(
      (a, b) => Number(b.version_number) - Number(a.version_number),
    )[0];
    if (!latestVersion?.files?.length) {
      return null;
    }

    const primary =
      latestVersion.files.find((file) => file.is_primary) ??
      latestVersion.files[0];
    return primary?.id ?? null;
  }

  private resolveFormat(dataset: BackendDataset): DatasetFormat {
    const fileFormat = dataset.versions
      ?.flatMap((version) => version.files ?? [])
      .map((file) => file.file_format.toUpperCase())
      .find((format) =>
        [
          'CSV',
          'TSV',
          'TXT',
          'XLS',
          'XLSX',
          'JSON',
          'XML',
          'SDMX',
          'PDF',
          'ZIP',
        ].includes(format),
      ) as DatasetFormat | undefined;

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
