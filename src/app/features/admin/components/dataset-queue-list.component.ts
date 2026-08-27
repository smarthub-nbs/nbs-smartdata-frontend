import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  AdminDatasetQueuePagination,
  AdminDatasetRecord,
  DatasetWorkflowStatus,
} from '@app/features/admin/models/admin-dataset.model';
import {
  workflowStatusChipClasses,
  workflowStatusLabel,
} from '@app/features/admin/utils/admin-workflow-status.util';
import { EmptyStateComponent, IconComponent } from '@shared/ui';

@Component({
  selector: 'app-dataset-queue-list',
  standalone: true,
  imports: [EmptyStateComponent, IconComponent],
  templateUrl: './dataset-queue-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetQueueListComponent {
  readonly items = input.required<AdminDatasetRecord[]>();
  readonly pagination = input.required<AdminDatasetQueuePagination>();
  readonly searchTerm = input.required<string>();
  readonly selectedId = input.required<string>();
  readonly checkedIds = input<string[]>([]);
  readonly canBulkSelect = input(false);
  readonly allPageChecked = input(false);
  readonly loading = input(false);
  readonly hasActiveSearch = input(false);
  readonly pageRangeLabel = input('');

  readonly searchInput = output<string>();
  readonly previousPage = output<void>();
  readonly nextPage = output<void>();
  readonly selectDataset = output<string>();
  readonly toggleChecked = output<string>();
  readonly toggleCheckAll = output<void>();

  protected readonly skeletonRows = Array.from({ length: 4 });

  protected isChecked(id: string): boolean {
    return this.checkedIds().includes(id);
  }

  protected onToggleChecked(event: Event, id: string): void {
    event.stopPropagation();
    this.toggleChecked.emit(id);
  }

  protected onToggleCheckAll(event: Event): void {
    event.stopPropagation();
    this.toggleCheckAll.emit();
  }

  protected onSearch(event: Event): void {
    this.searchInput.emit((event.target as HTMLInputElement).value);
  }

  protected onListKeydown(event: KeyboardEvent): void {
    const isNext = event.key === 'ArrowDown' || event.key === 'j';
    const isPrev = event.key === 'ArrowUp' || event.key === 'k';
    if (!isNext && !isPrev) {
      return;
    }

    const items = this.items();
    if (items.length === 0) {
      return;
    }
    event.preventDefault();

    const currentIndex = items.findIndex(
      (item) => item.id === this.selectedId(),
    );
    const nextIndex = this.resolveNextIndex(currentIndex, items.length, isNext);

    const next = items[nextIndex];
    if (!next) {
      return;
    }
    if (next.id !== this.selectedId()) {
      this.selectDataset.emit(next.id);
    }
    this.focusRow(event.currentTarget as HTMLElement, next.id);
  }

  private resolveNextIndex(
    currentIndex: number,
    length: number,
    isNext: boolean,
  ): number {
    if (currentIndex === -1) {
      return 0;
    }
    return isNext
      ? Math.min(length - 1, currentIndex + 1)
      : Math.max(0, currentIndex - 1);
  }

  private focusRow(origin: HTMLElement, id: string): void {
    origin
      .closest('ul')
      ?.querySelector<HTMLElement>(`[data-queue-id="${id}"]`)
      ?.focus({ preventScroll: false });
  }

  protected statusLabel(status: DatasetWorkflowStatus): string {
    return workflowStatusLabel(status);
  }

  protected readinessCount(record: AdminDatasetRecord): number {
    return [record.hasMetadata, record.hasTag, record.hasFile].filter(Boolean)
      .length;
  }

  protected statusPillClasses(status: DatasetWorkflowStatus): string {
    return workflowStatusChipClasses(status, 'sm');
  }

  protected queueItemClasses(id: string): string {
    const base =
      'min-w-0 flex-1 cursor-pointer rounded-lg px-3 py-3.5 text-left transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-nbs-primary/40 motion-reduce:transition-none';
    return id === this.selectedId()
      ? `${base} bg-nbs-primary/5 shadow-sm ring-1 ring-nbs-primary/20`
      : `${base} hover:bg-slate-50 hover:shadow-sm`;
  }
}
