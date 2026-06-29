import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AdminDatasetRecord,
  BackendAdminCategory,
  DatasetWorkflowStatus,
} from '@app/features/admin/models/admin-dataset.model';
import {
  workflowStatusChipClasses,
  workflowStatusLabel,
} from '@app/features/admin/utils/admin-workflow-status.util';
import { DatasetMetadataEditorComponent } from '@app/features/admin/components/dataset-metadata-editor.component';
import { DatasetResourceManagerComponent } from '@app/features/admin/components/dataset-resource-manager.component';
import { DatasetActivityLogComponent } from '@app/features/admin/components/dataset-activity-log.component';
import { ButtonComponent, IconComponent } from '@shared/ui';

@Component({
  selector: 'app-dataset-workflow-detail',
  standalone: true,
  imports: [
    RouterLink,
    ButtonComponent,
    IconComponent,
    DatasetMetadataEditorComponent,
    DatasetResourceManagerComponent,
    DatasetActivityLogComponent,
  ],
  templateUrl: './dataset-workflow-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetWorkflowDetailComponent {
  readonly record = input.required<AdminDatasetRecord>();
  readonly categories = input.required<BackendAdminCategory[]>();
  readonly categoriesLoading = input(false);
  readonly categoriesError = input<string | null>(null);
  readonly canReview = input(false);
  readonly canPublish = input(false);
  readonly actionLoading = input('');
  readonly message = input('');
  readonly messageError = input(false);
  readonly publishedId = input('');

  readonly dirtyChange = output<boolean>();
  readonly submitForReview = output<string>();
  readonly approve = output<string>();
  readonly reject = output<string>();
  readonly publish = output<string>();
  readonly uploadFile = output<File>();
  readonly metadataSaved = output<void>();
  readonly linkTag = output<string>();
  readonly categoryChange = output<string>();
  readonly resourcesChanged = output<void>();
  readonly deleteDataset = output<string>();

  private readonly metadataEditor = viewChild(DatasetMetadataEditorComponent);
  private readonly fileInput =
    viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly metadataDirty = signal(false);
  protected readonly tagName = signal('');

  protected readonly editable = computed(() => {
    const status = this.record().status;
    return this.canReview() || status === 'draft' || status === 'rejected';
  });

  protected readonly currentCategoryId = computed(() => {
    const categorySlug = this.record().categorySlug;
    if (!categorySlug) {
      return '';
    }
    return (
      this.categories().find((category) => category.slug === categorySlug)
        ?.id ?? ''
    );
  });

  protected readinessCompleteCount(record: AdminDatasetRecord): number {
    return [record.hasMetadata, record.hasTag, record.hasFile].filter(Boolean)
      .length;
  }

  protected readonly nextActionText = computed(() => {
    const record = this.record();
    switch (record.status) {
      case 'draft':
      case 'rejected': {
        if (this.canSubmit(record)) {
          return 'Ready to submit for review.';
        }
        const missing = this.missingRequirements(record);
        return missing.length > 0
          ? `Complete ${missing.join(', ')} before submitting.`
          : 'Complete all requirements before submitting.';
      }
      case 'in_review':
        return this.canReview()
          ? 'Review this dataset and approve or reject it.'
          : 'Waiting for an admin to review this dataset.';
      case 'approved':
        return this.canPublish()
          ? 'Publish to make this dataset visible in Discovery.'
          : 'Waiting for an admin to publish this dataset.';
      case 'published':
        return 'Published and visible in Discovery.';
      default:
        return '';
    }
  });

  isMetadataDirty(): boolean {
    return this.metadataEditor()?.isDirty() ?? false;
  }

  discardMetadata(): void {
    this.metadataEditor()?.discardChanges();
  }

  protected onMetadataDirtyChange(dirty: boolean): void {
    this.metadataDirty.set(dirty);
    this.dirtyChange.emit(dirty);
  }

  protected focusMetadata(): void {
    this.metadataEditor()?.scrollIntoView();
  }

  protected focusFileUpload(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) {
      this.uploadFile.emit(file);
    }
  }

  protected onTagInput(event: Event): void {
    this.tagName.set((event.target as HTMLInputElement).value);
  }

  protected submitTag(): void {
    const value = this.tagName().trim();
    if (value) {
      this.linkTag.emit(value);
      this.tagName.set('');
    }
  }

  protected saveCategory(categoryId: string): void {
    if (categoryId && categoryId !== this.currentCategoryId()) {
      this.categoryChange.emit(categoryId);
    }
  }

  protected canSubmit(record: AdminDatasetRecord): boolean {
    return (
      (record.status === 'draft' || record.status === 'rejected') &&
      record.hasMetadata &&
      record.hasFile &&
      record.hasTag
    );
  }

  protected canReviewRecord(record: AdminDatasetRecord): boolean {
    return record.status === 'in_review' && this.canReview();
  }

  protected canPublishRecord(record: AdminDatasetRecord): boolean {
    return record.status === 'approved' && this.canPublish();
  }

  protected missingRequirements(record: AdminDatasetRecord): string[] {
    const missing: string[] = [];
    if (!record.hasMetadata) {
      missing.push('metadata');
    }
    if (!record.hasTag) {
      missing.push('tag');
    }
    if (!record.hasFile) {
      missing.push('primary file');
    }
    return missing;
  }

  protected submitBlockedReason(record: AdminDatasetRecord): string {
    if (this.canSubmit(record)) {
      return '';
    }
    const missing = this.missingRequirements(record);
    if (missing.length > 0) {
      return `Missing: ${missing.join(', ')}`;
    }
    if (record.status !== 'draft' && record.status !== 'rejected') {
      return 'Only draft or rejected datasets can be submitted.';
    }
    return '';
  }

  protected statusLabel(status: DatasetWorkflowStatus): string {
    return workflowStatusLabel(status);
  }

  protected statusChipClasses(status: DatasetWorkflowStatus): string {
    return workflowStatusChipClasses(status);
  }
}
