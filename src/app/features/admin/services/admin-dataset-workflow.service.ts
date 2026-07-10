import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import { ApiService } from '@app/core/services/api.service';
import {
  AdminDatasetDraft,
  AdminDatasetFile,
  AdminDatasetMetadata,
  AdminDatasetMetadataForm,
  AdminDatasetQueueParams,
  AdminDatasetQueueResponse,
  AdminDatasetQueueSummary,
  AdminDatasetRecord,
  AdminDatasetResources,
  AdminDatasetTagLink,
  AdminDatasetVersion,
  BackendAdminCategory,
  BackendAdminDataset,
  BackendAdminQueueResponse,
  BackendAdminRegion,
  BackendAdminTag,
  BackendAuditLog,
  BackendDatasetFile,
  BackendDatasetTagLink,
  BackendDatasetVersion,
  BackendStatusHistory,
  DatasetBulkAction,
  DatasetBulkActionJob,
  DatasetBulkActionJobDetail,
  DatasetBulkUploadItemInput,
  DatasetBulkUploadJob,
  DatasetFrequencyValue,
} from '@app/features/admin/models/admin-dataset.model';
import {
  matchesDatasetId,
  resolveDatasetMetadata,
  resolveDatasetTitle,
} from '@app/features/admin/utils/dataset-metadata.util';

@Injectable({ providedIn: 'root' })
export class AdminDatasetWorkflowService {
  private readonly api = inject(ApiService);

  listCategories(): Observable<BackendAdminCategory[]> {
    return this.api.get<BackendAdminCategory[]>('/v1/dataset/categories/');
  }

  listTags(): Observable<BackendAdminTag[]> {
    return this.api.get<BackendAdminTag[]>('/v1/dataset/tags/');
  }

  listRegions(): Observable<BackendAdminRegion[]> {
    return this.api.get<BackendAdminRegion[]>('/v1/dataset/regions/');
  }

  createRegion(name: string): Observable<BackendAdminRegion> {
    return this.api.post<BackendAdminRegion>('/v1/dataset/regions/', {
      name: name.trim(),
    });
  }

  updateRegion(id: string, name: string): Observable<BackendAdminRegion> {
    return this.api.patch<BackendAdminRegion>(`/v1/dataset/regions/${id}/`, {
      name: name.trim(),
    });
  }

  deleteRegion(id: string): Observable<void> {
    return this.api
      .delete(`/v1/dataset/regions/${id}/`)
      .pipe(map(() => undefined));
  }

  listAdminQueue(
    params: AdminDatasetQueueParams,
  ): Observable<AdminDatasetQueueResponse> {
    return this.api
      .get<BackendAdminQueueResponse>(
        '/v1/dataset/admin-queue/',
        this.toQueueParams(params),
      )
      .pipe(map((response) => this.toQueueResponse(response)));
  }

  getAdminQueueSummary(): Observable<AdminDatasetQueueSummary> {
    return this.api.get<AdminDatasetQueueSummary>(
      '/v1/dataset/admin-queue/summary/',
    );
  }

  listOwnedQueue(): Observable<AdminDatasetRecord[]> {
    return this.api.get<BackendAdminDataset[]>('/v1/dataset/').pipe(
      switchMap((summaries) => {
        if (summaries.length === 0) {
          return of<AdminDatasetRecord[]>([]);
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

  updateDatasetCategory(
    datasetId: string,
    categoryId: string,
  ): Observable<AdminDatasetRecord> {
    return this.api
      .patch(`/v1/dataset/${datasetId}/`, { category: categoryId })
      .pipe(switchMap(() => this.getDataset(datasetId)));
  }

  getMetadata(id: string): Observable<AdminDatasetMetadata> {
    return this.api
      .get<BackendAdminDataset>(`/v1/dataset/${id}/`)
      .pipe(map((dataset) => this.toAdminMetadata(dataset)));
  }

  saveMetadata(
    datasetId: string,
    metadataId: string | null,
    form: AdminDatasetMetadataForm,
  ): Observable<AdminDatasetMetadata> {
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      license: form.license.trim(),
      frequency: form.frequency,
      region: form.region.trim(),
      year: form.year,
    };

    const resolvedId$ = metadataId
      ? of(metadataId)
      : this.getMetadata(datasetId).pipe(map((current) => current.metadataId));

    return resolvedId$.pipe(
      switchMap((id) =>
        id
          ? this.api.patch(`/v1/dataset/metadata/${id}/`, payload)
          : this.api.post('/v1/dataset/metadata/', {
              ...payload,
              dataset_id: datasetId,
            }),
      ),
      switchMap(() => this.getMetadata(datasetId)),
    );
  }

  linkTagById(datasetId: string, tagId: string): Observable<void> {
    return this.api
      .post('/v1/dataset/tag-links/', {
        dataset_id: datasetId,
        tag_id: tagId,
      })
      .pipe(map(() => undefined));
  }

  linkTagByName(
    datasetId: string,
    tagName: string,
    allowCreate = true,
  ): Observable<void> {
    return this.ensureTagLink(datasetId, tagName, allowCreate);
  }

  listTagLinks(datasetId: string): Observable<AdminDatasetTagLink[]> {
    return this.api
      .get<BackendDatasetTagLink[]>('/v1/dataset/tag-links/', {
        dataset: datasetId,
      })
      .pipe(
        map((tagLinks) =>
          tagLinks
            .filter((link) => matchesDatasetId(link.dataset, datasetId))
            .map((link) => this.toTagLink(link)),
        ),
      );
  }

  listResources(datasetId: string): Observable<AdminDatasetResources> {
    const params = { dataset: datasetId };
    return forkJoin({
      versions: this.api.get<BackendDatasetVersion[]>(
        '/v1/dataset/versions/',
        params,
      ),
      files: this.api.get<BackendDatasetFile[]>('/v1/dataset/files/', params),
      tagLinks: this.api.get<BackendDatasetTagLink[]>(
        '/v1/dataset/tag-links/',
        params,
      ),
    }).pipe(
      map(({ versions, files, tagLinks }) => ({
        versions: versions
          .filter((version) => matchesDatasetId(version.dataset, datasetId))
          .map((version) => this.toVersion(version)),
        files: files
          .filter((file) =>
            matchesDatasetId(file.dataset_version?.dataset, datasetId),
          )
          .map((file) => this.toFile(file)),
        tagLinks: tagLinks
          .filter((link) => matchesDatasetId(link.dataset, datasetId))
          .map((link) => this.toTagLink(link)),
      })),
    );
  }

  deleteDataset(datasetId: string): Observable<void> {
    return this.api
      .delete(`/v1/dataset/${datasetId}/`)
      .pipe(map(() => undefined));
  }

  deleteFile(fileId: string): Observable<void> {
    return this.api
      .delete(`/v1/dataset/files/${fileId}/`)
      .pipe(map(() => undefined));
  }

  unlinkTag(linkId: string): Observable<void> {
    return this.api
      .delete(`/v1/dataset/tag-links/${linkId}/`)
      .pipe(map(() => undefined));
  }

  createCategory(name: string): Observable<BackendAdminCategory> {
    return this.api.post<BackendAdminCategory>('/v1/dataset/categories/', {
      name: name.trim(),
    });
  }

  updateCategory(id: string, name: string): Observable<BackendAdminCategory> {
    return this.api.patch<BackendAdminCategory>(
      `/v1/dataset/categories/${id}/`,
      { name: name.trim() },
    );
  }

  deleteCategory(id: string): Observable<void> {
    return this.api
      .delete(`/v1/dataset/categories/${id}/`)
      .pipe(map(() => undefined));
  }

  createTag(name: string): Observable<BackendAdminTag> {
    return this.api.post<BackendAdminTag>('/v1/dataset/tags/', {
      name: name.trim(),
    });
  }

  updateTag(id: string, name: string): Observable<BackendAdminTag> {
    return this.api.patch<BackendAdminTag>(`/v1/dataset/tags/${id}/`, {
      name: name.trim(),
    });
  }

  deleteTag(id: string): Observable<void> {
    return this.api
      .delete(`/v1/dataset/tags/${id}/`)
      .pipe(map(() => undefined));
  }

  createDraftWithMetadata(
    draft: AdminDatasetDraft,
    allowTagCreate = true,
  ): Observable<string> {
    return this.api
      .post<BackendAdminDataset>('/v1/dataset/', {
        category: draft.categoryId,
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
              switchMap(() =>
                this.ensureTagLink(dataset.id, draft.tagName, allowTagCreate),
              ),
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

  unpublishDataset(datasetId: string, reason?: string): Observable<void> {
    return this.api
      .post(`/v1/dataset/${datasetId}/unpublish/`, {
        reason: reason ?? 'Temporarily withdrawing dataset.',
      })
      .pipe(map(() => undefined));
  }

  restoreDataset(datasetId: string, reason?: string): Observable<void> {
    return this.api
      .post(`/v1/dataset/${datasetId}/restore/`, {
        reason: reason ?? 'Restoring deleted dataset.',
      })
      .pipe(map(() => undefined));
  }

  transferOwner(
    datasetId: string,
    newOwnerId: string,
    reason?: string,
  ): Observable<void> {
    return this.api
      .post(`/v1/dataset/${datasetId}/transfer-owner/`, {
        new_owner_id: newOwnerId,
        reason: reason ?? 'Reassigning dataset ownership.',
      })
      .pipe(map(() => undefined));
  }

  validateFile(fileId: string, validationNotes?: string): Observable<void> {
    return this.api
      .post(`/v1/dataset/files/${fileId}/validate/`, {
        validation_notes: validationNotes ?? 'Admin revalidated file.',
      })
      .pipe(map(() => undefined));
  }

  createVersion(
    datasetId: string,
    versionNumber: string,
    changelog?: string,
  ): Observable<void> {
    return this.api
      .post('/v1/dataset/versions/', {
        dataset_id: datasetId,
        version_number: versionNumber.trim(),
        changelog: changelog?.trim() ?? '',
      })
      .pipe(map(() => undefined));
  }

  runBulkAction(
    action: DatasetBulkAction,
    datasetIds: string[],
    reason?: string,
  ): Observable<DatasetBulkActionJob> {
    return this.api.post<DatasetBulkActionJob>(
      '/v1/dataset/admin-queue/bulk-action/',
      {
        action,
        dataset_ids: datasetIds,
        reason: reason ?? '',
      },
    );
  }

  getBulkActionJob(jobId: string): Observable<DatasetBulkActionJobDetail> {
    return this.api.get<DatasetBulkActionJobDetail>(
      `/v1/dataset/admin-queue/bulk-action/jobs/${jobId}/`,
    );
  }

  runBulkUpload(
    items: DatasetBulkUploadItemInput[],
    options?: { publishAfterUpload?: boolean; reason?: string },
  ): Observable<DatasetBulkUploadJob> {
    const formData = new FormData();
    formData.append(
      'items',
      JSON.stringify(
        items.map((item) => ({
          dataset_id: item.datasetId,
          ...(item.datasetVersionId
            ? { dataset_version_id: item.datasetVersionId }
            : {}),
          is_primary: item.isPrimary ?? true,
        })),
      ),
    );
    for (const item of items) {
      formData.append('files', item.file, item.file.name);
    }
    formData.append(
      'publish_after_upload',
      String(options?.publishAfterUpload ?? false),
    );
    if (options?.reason) {
      formData.append('reason', options.reason);
    }
    return this.api.postMultipart<DatasetBulkUploadJob>(
      '/v1/dataset/admin-queue/bulk-upload/',
      formData,
    );
  }

  getBulkUploadJob(jobId: string): Observable<DatasetBulkUploadJob> {
    return this.api.get<DatasetBulkUploadJob>(
      `/v1/dataset/admin-queue/bulk-upload/jobs/${jobId}/`,
    );
  }

  listStatusHistory(datasetId: string): Observable<BackendStatusHistory[]> {
    return this.api.get<BackendStatusHistory[]>('/v1/dataset/status-history/', {
      dataset: datasetId,
    });
  }

  listAuditLogs(datasetId: string): Observable<BackendAuditLog[]> {
    return this.api
      .get<BackendAuditLog[]>('/v1/dataset/audit-logs/', {
        dataset: datasetId,
      })
      .pipe(
        map((logs) =>
          logs.filter((log) => matchesDatasetId(log.dataset, datasetId)),
        ),
      );
  }

  private ensureTagLink(
    datasetId: string,
    tagName: string,
    allowCreate: boolean,
  ): Observable<void> {
    const normalized = tagName.trim();
    if (!normalized) {
      return of(undefined);
    }

    return this.listTags().pipe(
      switchMap((tags) => {
        const slug = normalized
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const existing = tags.find(
          (tag) =>
            tag.slug === slug ||
            tag.name.toLowerCase() === normalized.toLowerCase(),
        );

        if (!existing && !allowCreate) {
          return throwError(
            () =>
              new ApiError(
                'Choose an existing tag from the list. Only admins can create new tags.',
                400,
              ),
          );
        }

        const tagId$ = existing
          ? of(existing.id)
          : this.api
              .post<BackendAdminTag>('/v1/dataset/tags/', {
                name: normalized,
              })
              .pipe(map((tag) => tag.id));

        return tagId$.pipe(
          switchMap((tagId) => this.linkTagById(datasetId, tagId)),
        );
      }),
    );
  }

  private toQueueParams(
    params: AdminDatasetQueueParams,
  ): Record<string, string> {
    const query: Record<string, string> = {};
    const search = params.q?.trim();

    if (search) {
      query['q'] = search;
    }
    if (params.status) {
      query['status'] = params.status;
    }
    if (params.page) {
      query['page'] = String(params.page);
    }
    if (params.pageSize) {
      query['page_size'] = String(params.pageSize);
    }

    return query;
  }

  private toQueueResponse(
    response: BackendAdminQueueResponse,
  ): AdminDatasetQueueResponse {
    return {
      items: response.items.map((item) => ({
        id: item.id,
        slug: item.slug,
        status: item.status,
        visibility: item.visibility,
        categorySlug: item.category_slug,
        categoryName: item.category_name,
        title: item.title ?? item.slug,
        hasMetadata: item.has_metadata,
        hasFile: item.has_file,
        hasTag: item.has_tag,
        primaryFileId: item.primary_file_id,
      })),
      pagination: {
        page: response.pagination.page,
        pageSize: response.pagination.page_size,
        totalPages: response.pagination.total_pages,
        totalItems: response.pagination.total_items,
        hasNext: response.pagination.has_next,
        hasPrevious: response.pagination.has_previous,
        next: response.pagination.next,
        previous: response.pagination.previous,
      },
    };
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
      title: resolveDatasetTitle(dataset.metadata, dataset.slug),
      hasMetadata: (dataset.metadata?.length ?? 0) > 0,
      hasFile: files.length > 0,
      hasTag: (dataset.tags?.length ?? 0) > 0,
      primaryFileId: primary?.id ?? null,
    };
  }

  private toAdminMetadata(dataset: BackendAdminDataset): AdminDatasetMetadata {
    const metadata = resolveDatasetMetadata(dataset.metadata);
    return {
      metadataId: metadata?.id ?? null,
      title: metadata?.title ?? '',
      description: metadata?.description ?? '',
      license: metadata?.license ?? 'Open Government Licence - Tanzania',
      frequency: this.toFrequencyValue(metadata?.frequency),
      region: metadata?.region ?? 'National',
      year: metadata?.year ?? null,
      publisher: metadata?.publisher_name ?? 'NBS',
    };
  }

  private toVersion(version: BackendDatasetVersion): AdminDatasetVersion {
    return {
      id: version.id,
      versionNumber: version.version_number,
      changelog: version.changelog,
    };
  }

  private toFile(file: BackendDatasetFile): AdminDatasetFile {
    return {
      id: file.id,
      filename: file.filename,
      fileFormat: file.file_format,
      fileSize: file.file_size,
      isPrimary: file.is_primary,
      validationStatus: file.validation_status,
    };
  }

  private toTagLink(link: BackendDatasetTagLink): AdminDatasetTagLink {
    return {
      linkId: link.id,
      tagId: link.tag.id,
      tagName: link.tag.name,
      tagSlug: link.tag.slug,
    };
  }

  private toFrequencyValue(
    frequency: string | undefined,
  ): DatasetFrequencyValue {
    switch ((frequency ?? '').toLowerCase()) {
      case 'quarterly':
        return 'quarterly';
      case 'monthly':
        return 'monthly';
      default:
        return 'annual';
    }
  }
}
