import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { Dataset } from '@app/features/discovery/models/dataset.model';
import { downloadBlob } from '@app/features/developers/utils/file-download.util';

@Injectable({ providedIn: 'root' })
export class DatasetDownloadService {
  private readonly api = inject(ApiService);

  downloadPrimaryFile(dataset: Dataset): Observable<void> {
    const fileId = dataset.primaryFileId;
    if (!fileId) {
      throw new Error('No downloadable file is available for this dataset.');
    }

    return this.api.downloadBlob(`/v1/dataset/files/${fileId}/download/`).pipe(
      map((response) => {
        const blob = response.body;
        if (!blob) {
          throw new Error('Download failed: empty response.');
        }
        const filename =
          this.resolveFilename(response) ??
          this.defaultFilename(dataset, blob.type);
        downloadBlob(blob, filename);
      }),
    );
  }

  private resolveFilename(response: {
    headers: { get(name: string): string | null };
  }): string | null {
    const disposition = response.headers.get('Content-Disposition');
    if (!disposition) {
      return null;
    }

    const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition);
    return match?.[1]?.trim() ?? null;
  }

  private defaultFilename(dataset: Dataset, mimeType: string): string {
    const extension = this.extensionForFormat(dataset.format, mimeType);
    const slug = dataset.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${slug || dataset.id}.${extension}`;
  }

  private extensionForFormat(
    format: Dataset['format'],
    mimeType: string,
  ): string {
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return 'xlsx';
    }
    if (mimeType.includes('csv')) {
      return 'csv';
    }
    if (mimeType.includes('json')) {
      return 'json';
    }
    return format.toLowerCase();
  }
}
