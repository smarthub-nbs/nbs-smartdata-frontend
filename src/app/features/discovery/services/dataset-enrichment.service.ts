import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import {
  DatasetFilePreview,
  DatasetIndexingStatus,
  DatasetUpdateRecord,
} from '@app/features/discovery/models/dataset.model';

interface BackendFileDataResponse {
  file_id: string;
  filename: string;
  file_format: string;
  columns?: string[];
  rows?: Record<string, string | number | boolean | null>[];
  document?: {
    page_count?: number;
    pages?: Array<{
      page_number: number;
      text: string;
    }>;
  };
  offset: number;
  limit: number;
  returned_rows: number;
  total_rows: number | null;
}

interface BackendStatusHistory {
  dataset?: string | { id: string };
  old_status: string;
  new_status: string;
  reason: string;
  changed_at: string;
}

interface BackendIndexingStatus {
  dataset?: string | { id: string };
  status: string;
  indexed_at: string;
  details: string;
}

@Injectable({ providedIn: 'root' })
export class DatasetEnrichmentService {
  private readonly api = inject(ApiService);

  getFilePreview(fileId: string, limit = 10): Observable<DatasetFilePreview> {
    return this.api
      .get<BackendFileDataResponse>(`/v1/dataset/files/${fileId}/data/`, {
        offset: '0',
        limit: String(limit),
      })
      .pipe(map((response) => this.toFilePreview(response)));
  }

  getUpdateHistory(datasetId: string): Observable<DatasetUpdateRecord[]> {
    return this.api
      .get<BackendStatusHistory[]>('/v1/dataset/status-history/')
      .pipe(
        map((entries) =>
          entries
            .filter((entry) => this.matchesDataset(entry.dataset, datasetId))
            .map((entry) => ({
              date: entry.changed_at,
              note: `${entry.old_status} → ${entry.new_status}: ${entry.reason}`,
            })),
        ),
      );
  }

  getIndexingStatus(
    datasetId: string,
  ): Observable<DatasetIndexingStatus | null> {
    return this.api
      .get<BackendIndexingStatus[]>('/v1/dataset/indexing-status/')
      .pipe(
        map((entries) => {
          const latest = entries
            .filter((entry) => this.matchesDataset(entry.dataset, datasetId))
            .sort(
              (a, b) =>
                new Date(b.indexed_at).getTime() -
                new Date(a.indexed_at).getTime(),
            )[0];

          if (!latest) {
            return null;
          }

          return {
            status: latest.status,
            indexedAt: latest.indexed_at,
            details: latest.details,
          };
        }),
      );
  }

  private toFilePreview(response: BackendFileDataResponse): DatasetFilePreview {
    if (response.columns && response.rows) {
      return {
        columns: response.columns,
        rows: response.rows,
        offset: response.offset,
        limit: response.limit,
        returnedRows: response.returned_rows,
        totalRows: response.total_rows,
      };
    }

    const pages = response.document?.pages ?? [];
    return {
      columns: pages.length > 0 ? ['Page', 'Text'] : [],
      rows: pages.map((page) => ({
        Page: page.page_number,
        Text: page.text,
      })),
      offset: response.offset,
      limit: response.limit,
      returnedRows: pages.length,
      totalRows: response.document?.page_count ?? response.total_rows,
    };
  }

  private matchesDataset(
    dataset: string | { id: string } | undefined,
    datasetId: string,
  ): boolean {
    if (!dataset) {
      return false;
    }
    return typeof dataset === 'string'
      ? dataset === datasetId
      : dataset.id === datasetId;
  }
}
