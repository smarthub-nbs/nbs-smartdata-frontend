import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
  private readonly taxonomy = inject(AdminTaxonomyStore);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly detail = viewChild(DatasetWorkflowDetailComponent);
  private readonly createDraft = viewChild(DatasetCreateDraftComponent);

  protected readonly categories = this.taxonomy.categories;
  protected readonly categoriesLoading = this.taxonomy.loading;
  protected readonly categoriesError = this.taxonomy.error;
  protected readonly pendingSwitchId = signal('');

  protected readonly canReview = this.auth.canReviewDatasets;
  protected readonly canPublish = this.auth.canPublishDatasets;

  constructor() {
    this.taxonomy.ensureLoaded();
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
}
