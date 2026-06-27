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
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';
  switch (status) {
    case 'published':
      return `${base} bg-emerald-100 text-emerald-800`;
    case 'approved':
      return `${base} bg-sky-100 text-sky-800`;
    case 'in_review':
      return `${base} bg-amber-100 text-amber-900`;
    case 'rejected':
      return `${base} bg-red-100 text-red-800`;
    default:
      return `${base} bg-slate-100 text-slate-700`;
  }
}
