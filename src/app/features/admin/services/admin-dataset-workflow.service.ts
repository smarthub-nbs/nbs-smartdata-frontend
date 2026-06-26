import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import {
  AdminDatasetDraft,
  AdminDatasetRecord,
  BackendAdminCategory,
  BackendAdminDataset,
  BackendAdminTag,
  BackendAuditLog,
  BackendStatusHistory,
} from '@app/features/admin/models/admin-dataset.model';

@Injectable({ providedIn: 'root' })
export class AdminDatasetWorkflowService {
  private readonly api = inject(ApiService);

  listCategories(): Observable<BackendAdminCategory[]> {
    return this.api.get<BackendAdminCategory[]>('/v1/dataset/categories/');
  }

  listTags(): Observable<BackendAdminTag[]> {
    return this.api.get<BackendAdminTag[]>('/v1/dataset/tags/');
  }

  listAdminDatasets(): Observable<AdminDatasetRecord[]> {
    return this.api.get<BackendAdminDataset[]>('/v1/dataset/').pipe(
      switchMap((summaries) => {
        if (summaries.length === 0) {
          return of([]);
        }

        return forkJoin(
          summaries.map((item) =>
            this.api
              .get<BackendAdminDataset>(`/v1/dataset/${item.id}/`)
              .pipe(map((dataset) => this.toAdminRecord(dataset))),
          ),
        );
      }),
    );
  }

  getDataset(id: string): Observable<AdminDatasetRecord> {
    return this.api
      .get<BackendAdminDataset>(`/v1/dataset/${id}/`)
      .pipe(map((dataset) => this.toAdminRecord(dataset)));
  }

  createDraftWithMetadata(draft: AdminDatasetDraft): Observable<string> {
    return this.api
      .post<BackendAdminDataset>('/v1/dataset/', {
        category: draft.categoryId,
        slug: draft.slug.trim() || undefined,
      })
      .pipe(
        switchMap((dataset) =>
          this.api
            .post('/v1/dataset/metadata/', {
              dataset_id: dataset.id,
              title: draft.title.trim(),
              description: draft.description.trim(),
              license: draft.license.trim(),
              frequency: draft.frequency,
              region: draft.region.trim(),
              year: draft.year,
            })
            .pipe(
              switchMap(() => this.ensureTagLink(dataset.id, draft.tagName)),
              map(() => dataset.id),
            ),
        ),
      );
  }

  uploadFile(
    datasetId: string,
    file: File,
    isPrimary = true,
  ): Observable<void> {
    const formData = new FormData();
    formData.append('dataset_id', datasetId);
    formData.append('file', file);
    formData.append('is_primary', String(isPrimary));
    return this.api
      .postMultipart<{ id: string }>('/v1/dataset/files/', formData)
      .pipe(map(() => undefined));
  }

  submitForReview(datasetId: string, reason?: string): Observable<void> {
    return this.api
      .post(`/v1/dataset/${datasetId}/submit-review/`, {
        reason: reason ?? 'Submitted for review.',
      })
      .pipe(map(() => undefined));
  }

  reviewDataset(
    datasetId: string,
    action: 'approve' | 'reject',
    reason?: string,
  ): Observable<void> {
    return this.api
      .post(`/v1/dataset/${datasetId}/review/`, {
        action,
        reason:
          reason ??
          (action === 'approve' ? 'Approved.' : 'Rejected — needs changes.'),
      })
      .pipe(map(() => undefined));
  }

  publishDataset(datasetId: string, reason?: string): Observable<void> {
    return this.api
      .post(`/v1/dataset/${datasetId}/publish/`, {
        reason: reason ?? 'Publishing approved dataset.',
      })
      .pipe(map(() => undefined));
  }

  listStatusHistory(datasetId: string): Observable<BackendStatusHistory[]> {
    return this.api.get<BackendStatusHistory[]>('/v1/dataset/status-history/', {
      dataset: datasetId,
    });
  }

  listAuditLogs(datasetId: string): Observable<BackendAuditLog[]> {
    return this.api.get<BackendAuditLog[]>('/v1/dataset/audit-logs/', {
      dataset: datasetId,
    });
  }

  private ensureTagLink(datasetId: string, tagName: string): Observable<void> {
    const normalized = tagName.trim();
    if (!normalized) {
      return of(undefined);
    }

    const slug = normalized
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return this.listTags().pipe(
      switchMap((tags) => {
        const existing = tags.find(
          (tag) =>
            tag.slug === slug ||
            tag.name.toLowerCase() === normalized.toLowerCase(),
        );

        const tagId$ = existing
          ? of(existing.id)
          : this.api
              .post<BackendAdminTag>('/v1/dataset/tags/', {
                name: normalized,
                slug,
              })
              .pipe(map((tag) => tag.id));

        return tagId$.pipe(
          switchMap((tagId) =>
            this.api.post('/v1/dataset/tag-links/', {
              dataset_id: datasetId,
              tag_id: tagId,
            }),
          ),
          map(() => undefined),
        );
      }),
    );
  }

  private toAdminRecord(dataset: BackendAdminDataset): AdminDatasetRecord {
    const files =
      dataset.versions?.flatMap((version) => version.files ?? []) ?? [];
    const primary = files.find((file) => file.is_primary) ?? files[0] ?? null;

    return {
      id: dataset.id,
      slug: dataset.slug,
      status: dataset.status,
      visibility: dataset.visibility,
      categorySlug: dataset.category?.slug ?? null,
      categoryName: dataset.category?.name ?? null,
      title: dataset.metadata?.[0]?.title ?? dataset.slug,
      hasMetadata: (dataset.metadata?.length ?? 0) > 0,
      hasFile: files.length > 0,
      hasTag: (dataset.tags?.length ?? 0) > 0,
      primaryFileId: primary?.id ?? null,
    };
  }
}
