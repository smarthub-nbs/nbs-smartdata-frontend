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
      return `${base} bg-slate-100 text-slate-700`;
    case 'approved':
      return `${base} bg-slate-100 text-slate-700`;
    case 'in_review':
      return `${base} bg-nbs-primary/10 text-nbs-primary`;
    case 'rejected':
      return `${base} bg-red-50 text-red-700`;
    default:
      return `${base} bg-slate-100 text-slate-600`;
  }
}
