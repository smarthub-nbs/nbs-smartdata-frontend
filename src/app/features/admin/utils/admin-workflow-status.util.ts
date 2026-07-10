import { DatasetWorkflowStatus } from '@app/features/admin/models/admin-dataset.model';
import { BadgeVariant } from '@shared/ui/models/badge-variant.model';

export function workflowStatusLabel(status: DatasetWorkflowStatus): string {
  switch (status) {
    case 'in_review':
      return 'In review';
    case 'draft':
      return 'Draft';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'published':
      return 'Published';
  }
}

export function workflowStatusChipClasses(
  status: DatasetWorkflowStatus,
  size: 'sm' | 'md' = 'md',
): string {
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs';
  const base = `inline-flex shrink-0 items-center rounded-md px-2 py-0.5 ${textSize} font-medium`;
  switch (status) {
    case 'published':
      return `${base} bg-nbs-success-soft text-nbs-success`;
    case 'approved':
      return `${base} bg-nbs-info-soft text-nbs-info`;
    case 'in_review':
      return `${base} bg-nbs-primary/10 text-nbs-primary`;
    case 'rejected':
      return `${base} bg-nbs-danger-soft text-nbs-danger`;
    default:
      return `${base} bg-slate-100 text-slate-600`;
  }
}

export function workflowStatusBadgeVariant(
  status: DatasetWorkflowStatus,
): BadgeVariant {
  switch (status) {
    case 'published':
      return 'success';
    case 'approved':
      return 'info';
    case 'in_review':
      return 'primary';
    case 'rejected':
      return 'danger';
    default:
      return 'neutral';
  }
}
