import {
  DestroyRef,
  Injectable,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Observable,
  Subject,
  debounceTime,
  distinctUntilChanged,
  finalize,
  of,
  tap,
} from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import { AuthService } from '@app/core/services/auth.service';
import {
  ADMIN_QUEUE_PAGE_SIZE,
  AdminDatasetDraft,
  AdminDatasetQueueParams,
  AdminDatasetQueuePagination,
  AdminDatasetQueueResponse,
  AdminDatasetQueueSummary,
  AdminDatasetRecord,
  AdminQueueScope,
  EMPTY_QUEUE_PAGINATION,
  EMPTY_QUEUE_SUMMARY,
  StatusCounts,
  StatusFilter,
} from '@app/features/admin/models/admin-dataset.model';
import { AdminDatasetWorkflowService } from '@app/features/admin/services/admin-dataset-workflow.service';
import { DatasetService } from '@app/features/discovery/services/dataset.service';

export interface AdminWorkspaceInitialState {
  status?: StatusFilter;
  q?: string;
  page?: number;
  datasetId?: string;
}

const ACTION_SUCCESS_MESSAGES: Record<string, string> = {
  submit: 'Submitted for review. An admin will approve or reject it.',
  approve: 'Dataset approved. You can now publish it.',
  reject: 'Dataset rejected. Update requirements and resubmit.',
  publish: 'Dataset published. It is now visible in Discovery.',
};

/**
 * Single owner of admin workspace state: queue paging/filtering, summary
 * counts, selection, and workflow mutations. Reviewers (admins) read the
 * server queue endpoints; publishers fall back to an owner-scoped list that is
 * filtered and paginated client-side.
 */
@Injectable()
export class AdminWorkspaceFacade {
  private readonly workflow = inject(AdminDatasetWorkflowService);
  private readonly datasetService = inject(DatasetService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly scope: AdminQueueScope = this.auth.canSeeAllDatasets()
    ? 'all'
    : 'own';

  private readonly _items = signal<AdminDatasetRecord[]>([]);
  private readonly _pagination = signal<AdminDatasetQueuePagination>(
    EMPTY_QUEUE_PAGINATION,
  );
  private readonly _summary =
    signal<AdminDatasetQueueSummary>(EMPTY_QUEUE_SUMMARY);
  private readonly _selectedRecord = signal<AdminDatasetRecord | null>(null);
  private readonly _statusFilter = signal<StatusFilter>('all');
  private readonly _searchTerm = signal('');
  private readonly _currentPage = signal(1);
  private readonly _queueLoading = signal(true);
  private readonly _queueError = signal<string | null>(null);
  private readonly _summaryError = signal<string | null>(null);
  private readonly _actionLoading = signal('');
  private readonly _message = signal('');
  private readonly _messageError = signal(false);
  private readonly _publishedId = signal('');
  private readonly _mutations = signal(0);

  readonly items = this._items.asReadonly();
  readonly pagination = this._pagination.asReadonly();
  readonly summary = this._summary.asReadonly();
  readonly selectedRecord = this._selectedRecord.asReadonly();
  readonly statusFilter = this._statusFilter.asReadonly();
  readonly searchTerm = this._searchTerm.asReadonly();
  readonly currentPage = this._currentPage.asReadonly();
  readonly queueLoading = this._queueLoading.asReadonly();
  readonly queueError = this._queueError.asReadonly();
  readonly summaryError = this._summaryError.asReadonly();
  readonly actionLoading = this._actionLoading.asReadonly();
  readonly message = this._message.asReadonly();
  readonly messageError = this._messageError.asReadonly();
  readonly publishedId = this._publishedId.asReadonly();
  /** Increments after each successful mutation so the page can refresh downstream caches. */
  readonly mutations = this._mutations.asReadonly();

  readonly selectedId = computed(() => this._selectedRecord()?.id ?? '');

  readonly statusCounts = computed<StatusCounts>(() => {
    const summary = this._summary();
    return {
      all: summary.total,
      draft: summary.draft,
      in_review: summary.in_review,
      approved: summary.approved,
      rejected: summary.rejected,
      published: summary.published,
    };
  });

  readonly hasActiveSearch = computed(
    () => this._searchTerm().trim().length > 0,
  );

  readonly hasNoDatasets = computed(
    () =>
      this.statusCounts().all === 0 &&
      this._items().length === 0 &&
      this._statusFilter() === 'all' &&
      !this.hasActiveSearch(),
  );

  readonly pageRangeLabel = computed(() => {
    const total = this._pagination().totalItems;
    if (total === 0) {
      return '0 results';
    }
    const { page, pageSize } = this._pagination();
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `${start}–${end} of ${total}`;
  });

  private ownedRecords: AdminDatasetRecord[] | null = null;
  private requestId = 0;
  private readonly searchInputs = new Subject<string>();

  constructor() {
    this.searchInputs
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this._currentPage.set(1);
        this.loadQueue();
      });
  }

  init(initial?: AdminWorkspaceInitialState): void {
    if (initial?.status) {
      this._statusFilter.set(initial.status);
    }
    if (initial?.q) {
      this._searchTerm.set(initial.q);
    }
    if (initial?.page && initial.page > 0) {
      this._currentPage.set(initial.page);
    }
    this.loadSummary();
    this.loadQueue(initial?.datasetId);
  }

  setStatusFilter(filter: StatusFilter): void {
    if (filter === this._statusFilter()) {
      return;
    }
    this._statusFilter.set(filter);
    this._currentPage.set(1);
    this.loadQueue();
  }

  search(term: string): void {
    this._searchTerm.set(term);
    this.searchInputs.next(term);
  }

  goToPreviousPage(): void {
    const page = Math.max(1, this._currentPage() - 1);
    if (page === this._currentPage()) {
      return;
    }
    this._currentPage.set(page);
    this.loadQueue();
  }

  goToNextPage(): void {
    const page = Math.min(
      this._pagination().totalPages,
      this._currentPage() + 1,
    );
    if (page === this._currentPage()) {
      return;
    }
    this._currentPage.set(page);
    this.loadQueue();
  }

  selectDataset(id: string): void {
    this.clearMessage();
    this._publishedId.set('');
    const onPage = this._items().find((item) => item.id === id) ?? null;
    if (onPage) {
      this._selectedRecord.set(onPage);
      return;
    }
    this.workflow
      .getDataset(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (record) => this._selectedRecord.set(record),
        error: (error: unknown) => this.showError(error),
      });
  }

  submit(id: string): void {
    this.runAction('submit', () => this.workflow.submitForReview(id), {
      datasetId: id,
      statusChanged: true,
    });
  }

  approve(id: string): void {
    this.runAction(
      'approve',
      () => this.workflow.reviewDataset(id, 'approve'),
      {
        datasetId: id,
        statusChanged: true,
      },
    );
  }

  reject(id: string): void {
    this.runAction('reject', () => this.workflow.reviewDataset(id, 'reject'), {
      datasetId: id,
      statusChanged: true,
    });
  }

  publish(id: string): void {
    this.runAction('publish', () => this.workflow.publishDataset(id), {
      datasetId: id,
      statusChanged: true,
      publishedId: id,
    });
  }

  linkTag(id: string, tagName: string): void {
    const value = tagName.trim();
    if (!value) {
      return;
    }
    this._actionLoading.set('tag');
    this.workflow
      .linkTagByName(id, value)
      .pipe(
        finalize(() => this._actionLoading.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.setMessage('Tag linked.');
          this.refreshAfterMutation({ datasetId: id });
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  deleteDataset(id: string): void {
    this._actionLoading.set('delete');
    this.workflow
      .deleteDataset(id)
      .pipe(
        finalize(() => this._actionLoading.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this._selectedRecord.set(null);
          this.setMessage('Dataset deleted.');
          this.refreshAfterMutation({ datasetId: '', statusChanged: true });
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  /** Reloads queue + selected detail after an external resource mutation. */
  refreshDataset(id: string): void {
    this.refreshAfterMutation({ datasetId: id });
  }

  uploadFile(id: string, file: File): void {
    this._actionLoading.set('upload');
    this.workflow
      .uploadFile(id, file)
      .pipe(
        finalize(() => this._actionLoading.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.setMessage(
            `Uploaded ${file.name}. Check readiness, then submit for review when complete.`,
          );
          this.refreshAfterMutation({ datasetId: id });
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  createDraft(draft: AdminDatasetDraft, file: File | null): Observable<string> {
    this._actionLoading.set('create');
    const create$ = this.workflow.createDraftWithMetadata(draft);
    return new Observable<string>((subscriber) => {
      create$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (id) => {
          const finish = () => {
            this.setMessage(
              file
                ? 'Draft created and file uploaded. Complete any remaining requirements, then submit for review.'
                : 'Draft created. Upload a primary file, then submit for review.',
            );
            this._actionLoading.set('');
            this.refreshAfterMutation({ datasetId: id, resetToAll: true });
            subscriber.next(id);
            subscriber.complete();
          };

          if (!file) {
            finish();
            return;
          }
          this.workflow
            .uploadFile(id, file)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => finish(),
              error: (error: unknown) => {
                this._actionLoading.set('');
                this.showError(error);
                subscriber.error(error);
              },
            });
        },
        error: (error: unknown) => {
          this._actionLoading.set('');
          this.showError(error);
          subscriber.error(error);
        },
      });
    });
  }

  /** Called by the metadata editor after a successful save (no status change). */
  onMetadataSaved(datasetId: string): void {
    this.refreshAfterMutation({ datasetId });
  }

  refreshAfterMutation(opts: {
    datasetId: string;
    statusChanged?: boolean;
    resetToAll?: boolean;
    publishedId?: string;
  }): void {
    if (this.scope === 'own') {
      this.ownedRecords = null;
    }
    if (opts.resetToAll) {
      this._statusFilter.set('all');
      this._currentPage.set(1);
    }
    if (opts.publishedId) {
      this._publishedId.set(opts.publishedId);
    }
    if (opts.statusChanged && this.scope === 'all') {
      this.loadSummary();
    }
    this.loadQueue(opts.datasetId);
    this.datasetService.markCatalogStale();
    this._mutations.update((count) => count + 1);
  }

  loadSummary(): void {
    if (this.scope !== 'all') {
      return;
    }
    this._summaryError.set(null);
    this.workflow
      .getAdminQueueSummary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => this._summary.set(summary),
        error: (error: unknown) =>
          this._summaryError.set(this.resolveErrorMessage(error)),
      });
  }

  clearMessage(): void {
    this._message.set('');
    this._messageError.set(false);
  }

  showError(error: unknown): void {
    this._messageError.set(true);
    this._message.set(this.resolveErrorMessage(error));
  }

  private setMessage(message: string): void {
    this._messageError.set(false);
    this._message.set(message);
  }

  private runAction(
    key: keyof typeof ACTION_SUCCESS_MESSAGES,
    action: () => Observable<void>,
    refresh: {
      datasetId: string;
      statusChanged?: boolean;
      publishedId?: string;
    },
  ): void {
    this._actionLoading.set(key);
    action()
      .pipe(
        finalize(() => this._actionLoading.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.setMessage(ACTION_SUCCESS_MESSAGES[key]);
          this.refreshAfterMutation(refresh);
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  private loadQueue(selectId?: string): void {
    const requestId = ++this.requestId;
    this._queueLoading.set(true);
    this._queueError.set(null);

    const source: Observable<AdminDatasetQueueResponse | AdminDatasetRecord[]> =
      this.scope === 'all'
        ? this.workflow.listAdminQueue(this.params())
        : this.ensureOwned();

    source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        if (requestId !== this.requestId) {
          return;
        }
        if (this.scope === 'all') {
          this.applyServerResponse(
            result as AdminDatasetQueueResponse,
            selectId,
          );
        } else {
          this.applyOwned(result as AdminDatasetRecord[], selectId);
        }
        this._queueLoading.set(false);
      },
      error: (error: unknown) => {
        if (requestId !== this.requestId) {
          return;
        }
        this._queueError.set(this.resolveErrorMessage(error));
        this._queueLoading.set(false);
      },
    });
  }

  private ensureOwned(): Observable<AdminDatasetRecord[]> {
    if (this.ownedRecords) {
      return of(this.ownedRecords);
    }
    return this.workflow
      .listOwnedQueue()
      .pipe(tap((records) => (this.ownedRecords = records)));
  }

  private applyServerResponse(
    response: AdminDatasetQueueResponse,
    selectId?: string,
  ): void {
    this._items.set(response.items);
    this._pagination.set(response.pagination);
    this._currentPage.set(response.pagination.page);
    this.resolveSelection(response.items, selectId);
  }

  private applyOwned(records: AdminDatasetRecord[], selectId?: string): void {
    this._summary.set(this.countByStatus(records));

    const filtered = this.filterOwned(records);
    const pageSize = ADMIN_QUEUE_PAGE_SIZE;
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = Math.min(this._currentPage(), totalPages);
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    this._items.set(items);
    this._currentPage.set(page);
    this._pagination.set({
      page,
      pageSize,
      totalPages,
      totalItems,
      hasPrevious: page > 1,
      hasNext: page < totalPages,
      next: null,
      previous: null,
    });
    this.resolveSelection(items, selectId);
  }

  private resolveSelection(
    items: AdminDatasetRecord[],
    selectId?: string,
  ): void {
    const targetId = selectId ?? this.selectedId();
    if (targetId) {
      const onPage = items.find((item) => item.id === targetId) ?? null;
      if (onPage) {
        this._selectedRecord.set(onPage);
        return;
      }
      if (!this._selectedRecord() || selectId) {
        this.workflow
          .getDataset(targetId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (record) => this._selectedRecord.set(record),
            error: () => this._selectedRecord.set(null),
          });
      }
      return;
    }
    this._selectedRecord.set(items[0] ?? null);
  }

  private filterOwned(records: AdminDatasetRecord[]): AdminDatasetRecord[] {
    const filter = this._statusFilter();
    const query = this._searchTerm().trim().toLowerCase();
    let rows = records;
    if (filter !== 'all') {
      rows = rows.filter((item) => item.status === filter);
    }
    if (query) {
      rows = rows.filter((item) => item.title.toLowerCase().includes(query));
    }
    return rows;
  }

  private countByStatus(
    records: AdminDatasetRecord[],
  ): AdminDatasetQueueSummary {
    const summary: AdminDatasetQueueSummary = { ...EMPTY_QUEUE_SUMMARY };
    for (const record of records) {
      summary.total++;
      summary[record.status]++;
    }
    return summary;
  }

  private params(): AdminDatasetQueueParams {
    const filter = this._statusFilter();
    return {
      q: this._searchTerm(),
      status: filter === 'all' ? undefined : filter,
      page: this._currentPage(),
      pageSize: ADMIN_QUEUE_PAGE_SIZE,
    };
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Request failed.';
  }
}
