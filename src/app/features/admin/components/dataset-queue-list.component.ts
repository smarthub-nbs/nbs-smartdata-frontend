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
  StatusCounts,
  StatusFilter,
} from '@app/features/admin/models/admin-dataset.model';
import { workflowStatusLabel } from '@app/features/admin/utils/admin-workflow-status.util';
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
  imports: [IconComponent],
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

  protected readinessCount(record: AdminDatasetRecord): number {
    return [record.hasMetadata, record.hasTag, record.hasFile].filter(Boolean)
      .length;
  }

  protected filterChipClasses(filter: StatusFilter): string {
    const active = this.statusFilter() === filter;
    const empty = filter !== 'all' && this.chipCount(filter) === 0;
    if (active) {
      return 'bg-nbs-primary text-white';
    }
    if (empty) {
      return 'bg-slate-100 text-slate-400 hover:bg-slate-200';
    }
    return 'bg-slate-100 text-slate-700 hover:bg-slate-200';
  }

  protected chipCountClasses(filter: StatusFilter): string {
    const active = this.statusFilter() === filter;
    return active
      ? 'tabular-nums text-white/80'
      : 'tabular-nums text-slate-400';
  }

  protected statusDotClasses(status: DatasetWorkflowStatus): string {
    switch (status) {
      case 'published':
        return 'bg-emerald-500';
      case 'approved':
        return 'bg-sky-500';
      case 'in_review':
        return 'bg-amber-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-slate-400';
    }
  }

  protected statusPillClasses(status: DatasetWorkflowStatus): string {
    const base =
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium';
    switch (status) {
      case 'published':
        return `${base} bg-emerald-50 text-emerald-800`;
      case 'approved':
        return `${base} bg-sky-50 text-sky-800`;
      case 'in_review':
        return `${base} bg-amber-50 text-amber-900`;
      case 'rejected':
        return `${base} bg-red-50 text-red-800`;
      default:
        return `${base} bg-slate-100 text-slate-700`;
    }
  }

  protected queueItemClasses(id: string): string {
    const base =
      'w-full cursor-pointer border-l-2 py-2.5 pl-3 pr-3 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nbs-primary/40 motion-reduce:transition-none';
    return id === this.selectedId()
      ? `${base} border-l-nbs-primary bg-nbs-primary/5`
      : `${base} border-l-transparent bg-white hover:bg-slate-50`;
  }
}
