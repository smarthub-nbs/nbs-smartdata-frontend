import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '@app/core/services/auth.service';
import { StatusFilter } from '@app/features/admin/models/admin-dataset.model';
import { AdminTaxonomyStore } from '@app/features/admin/services/admin-taxonomy.store';
import { AdminWorkspaceFacade } from '@app/features/admin/services/admin-workspace.facade';
import { DatasetQueueListComponent } from '@app/features/admin/components/dataset-queue-list.component';
import { DatasetWorkflowDetailComponent } from '@app/features/admin/components/dataset-workflow-detail.component';
import {
  CreateDraftPayload,
  DatasetCreateDraftComponent,
} from '@app/features/admin/components/dataset-create-draft.component';
import {
  ButtonComponent,
  AlertComponent,
  EmptyStateComponent,
  IconComponent,
  ModalComponent,
} from '@shared/ui';

interface StatusFilterItem {
  key: StatusFilter;
  label: string;
}

const STATUS_FILTERS: readonly StatusFilterItem[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'in_review', label: 'In review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'published', label: 'Published' },
];

@Component({
  selector: 'app-dataset-workflow-panel',
  standalone: true,
  imports: [
    DecimalPipe,
    ButtonComponent,
    AlertComponent,
    EmptyStateComponent,
    IconComponent,
    DatasetQueueListComponent,
    DatasetWorkflowDetailComponent,
    DatasetCreateDraftComponent,
    ModalComponent,
  ],
  templateUrl: './dataset-workflow-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetWorkflowPanelComponent {
  protected readonly facade = inject(AdminWorkspaceFacade);
  private readonly taxonomy = inject(AdminTaxonomyStore);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly detail = viewChild(DatasetWorkflowDetailComponent);
  private readonly createDraft = viewChild(DatasetCreateDraftComponent);

  protected readonly categories = this.taxonomy.categories;
  protected readonly tags = this.taxonomy.tags;
  protected readonly categoriesLoading = this.taxonomy.loading;
  protected readonly categoriesError = this.taxonomy.error;
  protected readonly pendingSwitchId = signal('');
  protected readonly mobileDetailOpen = signal(false);
  protected readonly createDraftOpen = signal(false);

  protected readonly canReview = this.auth.canReviewDatasets;
  protected readonly canPublish = this.auth.canPublishDatasets;
  protected readonly statusFilters = STATUS_FILTERS;

  protected readonly showQueueOnMobile = computed(
    () => !this.mobileDetailOpen(),
  );

  protected readonly showDetailOnMobile = computed(() =>
    this.mobileDetailOpen(),
  );

  protected readonly showDetailEmptyState = computed(
    () =>
      !this.facade.queueLoading() &&
      !this.facade.selectedRecord() &&
      this.facade.items().length > 0,
  );

  constructor() {
    this.taxonomy.ensureLoaded();
    if (this.facade.selectedId()) {
      this.mobileDetailOpen.set(true);
    }
  }

  protected openCreateDraft(): void {
    this.createDraftOpen.set(true);
  }

  protected closeCreateDraft(): void {
    this.createDraftOpen.set(false);
    this.createDraft()?.reset();
  }

  protected onSelect(id: string): void {
    if (id === this.facade.selectedId()) {
      this.mobileDetailOpen.set(true);
      return;
    }
    if (this.detail()?.hasUnsavedChanges()) {
      this.pendingSwitchId.set(id);
      return;
    }
    this.facade.selectDataset(id);
    this.mobileDetailOpen.set(true);
  }

  protected backToQueue(): void {
    this.mobileDetailOpen.set(false);
  }

  protected confirmDiscardSwitch(): void {
    const nextId = this.pendingSwitchId();
    if (!nextId) {
      return;
    }
    this.detail()?.discardUnsavedChanges();
    this.pendingSwitchId.set('');
    this.facade.selectDataset(nextId);
    this.mobileDetailOpen.set(true);
  }

  protected cancelPendingSwitch(): void {
    this.pendingSwitchId.set('');
  }

  protected onFilter(filter: StatusFilter): void {
    this.facade.setStatusFilter(filter);
    this.mobileDetailOpen.set(false);
  }

  protected onSearch(term: string): void {
    this.facade.search(term);
  }

  protected onCreateDraft(payload: CreateDraftPayload): void {
    this.facade
      .createDraft(payload.draft, payload.file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.createDraftOpen.set(false);
          this.createDraft()?.reset();
          this.mobileDetailOpen.set(true);
        },
        error: () => undefined,
      });
  }

  protected onTagsChanged(datasetId: string): void {
    this.facade.onTagsChanged(datasetId);
    this.taxonomy.refresh();
    this.detail()?.reloadTagLinks();
  }

  protected onResourcesChanged(datasetId: string): void {
    this.facade.refreshDataset(datasetId);
    this.detail()?.reloadTagLinks();
  }

  protected statCount(filter: StatusFilter): number {
    return this.facade.statusCounts()[filter];
  }

  protected statFilterClasses(filter: StatusFilter): string {
    const base =
      'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-nbs-primary/40 motion-reduce:transition-none';
    const active = this.facade.statusFilter() === filter;
    return active
      ? `${base} bg-nbs-primary text-white`
      : `${base} bg-slate-100 text-slate-600 hover:bg-slate-200`;
  }

  protected statCountClasses(filter: StatusFilter): string {
    const base = 'tabular-nums';
    return this.facade.statusFilter() === filter
      ? `${base} text-white/75`
      : `${base} text-slate-400`;
  }
}
