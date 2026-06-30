import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UpperCasePipe } from '@angular/common';
import { finalize } from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import {
  AdminDatasetResources,
  AdminDatasetTagLink,
} from '@app/features/admin/models/admin-dataset.model';
import { AdminDatasetWorkflowService } from '@app/features/admin/services/admin-dataset-workflow.service';
import { ButtonComponent, IconComponent } from '@shared/ui';

const EMPTY_RESOURCES: AdminDatasetResources = {
  versions: [],
  files: [],
  tagLinks: [],
};

@Component({
  selector: 'app-dataset-resource-manager',
  standalone: true,
  imports: [ButtonComponent, IconComponent, UpperCasePipe],
  templateUrl: './dataset-resource-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetResourceManagerComponent {
  readonly datasetId = input.required<string>();

  readonly resourcesChanged = output<void>();
  readonly deleteDataset = output<string>();

  private readonly workflow = inject(AdminDatasetWorkflowService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly expanded = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly resources = signal<AdminDatasetResources>(EMPTY_RESOURCES);
  protected readonly actionId = signal('');
  protected readonly confirmingDelete = signal(false);
  protected readonly confirmingFileId = signal('');
  protected readonly confirmingTagLinkId = signal('');

  private loadedId = '';

  constructor() {
    effect(
      () => {
        const id = this.datasetId();
        this.confirmingDelete.set(false);
        this.confirmingFileId.set('');
        this.confirmingTagLinkId.set('');
        if (id !== this.loadedId) {
          this.resources.set(EMPTY_RESOURCES);
          if (this.expanded()) {
            this.load();
          }
        }
      },
      { allowSignalWrites: true },
    );
  }

  protected toggle(): void {
    this.expanded.update((open) => !open);
    if (this.expanded() && this.loadedId !== this.datasetId()) {
      this.load();
    }
  }

  open(): void {
    if (this.expanded()) {
      return;
    }
    this.expanded.set(true);
    if (this.loadedId !== this.datasetId()) {
      this.load();
    }
  }

  protected requestDeleteFile(fileId: string): void {
    this.confirmingFileId.set(fileId);
    this.confirmingTagLinkId.set('');
    this.confirmingDelete.set(false);
  }

  protected cancelDeleteFile(): void {
    this.confirmingFileId.set('');
  }

  protected confirmDeleteFile(fileId: string): void {
    this.confirmingFileId.set('');
    this.actionId.set(fileId);
    this.workflow
      .deleteFile(fileId)
      .pipe(
        finalize(() => this.actionId.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.afterMutation(),
        error: (error: unknown) => this.error.set(this.resolveError(error)),
      });
  }

  protected requestUnlinkTag(linkId: string): void {
    this.confirmingTagLinkId.set(linkId);
    this.confirmingFileId.set('');
    this.confirmingDelete.set(false);
  }

  protected cancelUnlinkTag(): void {
    this.confirmingTagLinkId.set('');
  }

  protected confirmUnlinkTag(link: AdminDatasetTagLink): void {
    this.confirmingTagLinkId.set('');
    this.actionId.set(link.linkId);
    this.workflow
      .unlinkTag(link.linkId)
      .pipe(
        finalize(() => this.actionId.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.afterMutation(),
        error: (error: unknown) => this.error.set(this.resolveError(error)),
      });
  }

  protected requestDeleteDataset(): void {
    this.confirmingDelete.set(true);
    this.confirmingFileId.set('');
    this.confirmingTagLinkId.set('');
  }

  protected cancelDeleteDataset(): void {
    this.confirmingDelete.set(false);
  }

  protected confirmDeleteDataset(): void {
    this.confirmingDelete.set(false);
    this.deleteDataset.emit(this.datasetId());
  }

  protected formatSize(bytes: number | null): string {
    if (!bytes || bytes <= 0) {
      return '—';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );
    const value = bytes / Math.pow(1024, exponent);
    return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
  }

  private afterMutation(): void {
    this.resourcesChanged.emit();
    this.load();
  }

  private load(): void {
    const id = this.datasetId();
    this.loading.set(true);
    this.error.set('');
    this.workflow
      .listResources(id)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (resources) => {
          this.loadedId = id;
          this.resources.set(resources);
        },
        error: (error: unknown) => this.error.set(this.resolveError(error)),
      });
  }

  private resolveError(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Request failed.';
  }
}
