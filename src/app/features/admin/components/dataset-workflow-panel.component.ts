import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import { AuthService } from '@app/core/services/auth.service';
import {
  BackendAdminCategory,
  StatusFilter,
} from '@app/features/admin/models/admin-dataset.model';
import { AdminDatasetWorkflowService } from '@app/features/admin/services/admin-dataset-workflow.service';
import { AdminWorkspaceFacade } from '@app/features/admin/services/admin-workspace.facade';
import { DatasetQueueListComponent } from '@app/features/admin/components/dataset-queue-list.component';
import { DatasetWorkflowDetailComponent } from '@app/features/admin/components/dataset-workflow-detail.component';
import {
  CreateDraftPayload,
  DatasetCreateDraftComponent,
} from '@app/features/admin/components/dataset-create-draft.component';
import { ButtonComponent, IconComponent } from '@shared/ui';

@Component({
  selector: 'app-dataset-workflow-panel',
  standalone: true,
  imports: [
    ButtonComponent,
    IconComponent,
    DatasetQueueListComponent,
    DatasetWorkflowDetailComponent,
    DatasetCreateDraftComponent,
  ],
  templateUrl: './dataset-workflow-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetWorkflowPanelComponent {
  protected readonly facade = inject(AdminWorkspaceFacade);
  private readonly workflow = inject(AdminDatasetWorkflowService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly detail = viewChild(DatasetWorkflowDetailComponent);
  private readonly createDraft = viewChild(DatasetCreateDraftComponent);

  protected readonly categories = signal<BackendAdminCategory[]>([]);
  protected readonly categoriesLoading = signal(true);
  protected readonly categoriesError = signal<string | null>(null);
  protected readonly pendingSwitchId = signal('');

  protected readonly canReview = this.auth.canReviewDatasets;
  protected readonly canPublish = this.auth.canPublishDatasets;

  constructor() {
    this.loadCategories();
  }

  protected openCreateDraft(): void {
    this.createDraft()?.open();
  }

  protected onSelect(id: string): void {
    if (id === this.facade.selectedId()) {
      return;
    }
    if (this.detail()?.isMetadataDirty()) {
      this.pendingSwitchId.set(id);
      return;
    }
    this.facade.selectDataset(id);
  }

  protected confirmDiscardSwitch(): void {
    const nextId = this.pendingSwitchId();
    if (!nextId) {
      return;
    }
    this.detail()?.discardMetadata();
    this.pendingSwitchId.set('');
    this.facade.selectDataset(nextId);
  }

  protected cancelPendingSwitch(): void {
    this.pendingSwitchId.set('');
  }

  protected onFilter(filter: StatusFilter): void {
    this.facade.setStatusFilter(filter);
  }

  protected onSearch(term: string): void {
    this.facade.search(term);
  }

  protected onCreateDraft(payload: CreateDraftPayload): void {
    this.facade
      .createDraft(payload.draft, payload.file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.createDraft()?.reset(),
        error: () => undefined,
      });
  }

  private loadCategories(): void {
    this.categoriesLoading.set(true);
    this.categoriesError.set(null);
    this.workflow
      .listCategories()
      .pipe(
        finalize(() => this.categoriesLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (categories) => this.categories.set(categories),
        error: (error: unknown) =>
          this.categoriesError.set(this.resolveErrorMessage(error)),
      });
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
