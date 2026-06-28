import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  AdminDatasetQueuePagination,
  AdminDatasetRecord,
  DatasetWorkflowStatus,
  StatusCounts,
  StatusFilter,
} from '@app/features/admin/models/admin-dataset.model';
import {
  workflowStatusChipClasses,
  workflowStatusLabel,
} from '@app/features/admin/utils/admin-workflow-status.util';
import { IconComponent } from '@shared/ui';

interface FilterChip {
  readonly key: StatusFilter;
  readonly label: string;
}

const FILTER_CHIPS: readonly FilterChip[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'in_review', label: 'In review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'published', label: 'Published' },
];

@Component({
  selector: 'app-dataset-queue-list',
  standalone: true,
  imports: [DecimalPipe, IconComponent],
  templateUrl: './dataset-queue-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetQueueListComponent {
  readonly items = input.required<AdminDatasetRecord[]>();
  readonly pagination = input.required<AdminDatasetQueuePagination>();
  readonly statusCounts = input.required<StatusCounts>();
  readonly statusFilter = input.required<StatusFilter>();
  readonly searchTerm = input.required<string>();
  readonly selectedId = input.required<string>();
  readonly loading = input(false);
  readonly hasActiveSearch = input(false);
  readonly pageRangeLabel = input('');

  readonly filterChange = output<StatusFilter>();
  readonly searchInput = output<string>();
  readonly previousPage = output<void>();
  readonly nextPage = output<void>();
  readonly selectDataset = output<string>();

  protected readonly filterChips = FILTER_CHIPS;
  protected readonly skeletonRows = Array.from({ length: 4 });

  protected chipCount(filter: StatusFilter): number {
    return this.statusCounts()[filter];
  }

  protected onSearch(event: Event): void {
    this.searchInput.emit((event.target as HTMLInputElement).value);
  }

  protected statusLabel(status: DatasetWorkflowStatus): string {
    return workflowStatusLabel(status);
  }

  protected statusChipClasses(status: DatasetWorkflowStatus): string {
    return workflowStatusChipClasses(status);
  }

  protected readinessCount(record: AdminDatasetRecord): number {
    return [record.hasMetadata, record.hasTag, record.hasFile].filter(Boolean)
      .length;
  }

  protected filterChipClasses(filter: StatusFilter): string {
    const active = this.statusFilter() === filter;
    const empty = filter !== 'all' && this.chipCount(filter) === 0;
    if (active) {
      return 'rounded-full border border-nbs-primary bg-nbs-primary/10 px-3 py-1 text-xs font-medium text-nbs-primary';
    }
    if (empty) {
      return 'rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600';
    }
    return 'rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-nbs-primary hover:text-nbs-primary';
  }

  protected queueItemClasses(id: string): string {
    const base =
      'w-full rounded-md border px-3 py-3 text-left transition-colors';
    return id === this.selectedId()
      ? `${base} border-nbs-primary bg-nbs-primary/5`
      : `${base} border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50`;
  }
}
