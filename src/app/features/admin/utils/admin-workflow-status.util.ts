import { DatasetWorkflowStatus } from '@app/features/admin/models/admin-dataset.model';

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
): string {
  const base =
    'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium';
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
