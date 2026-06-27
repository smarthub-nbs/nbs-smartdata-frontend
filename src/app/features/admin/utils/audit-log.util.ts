import { BackendAuditLog } from '@app/features/admin/models/admin-dataset.model';

export interface AdminAuditEntry {
  readonly key: string;
  readonly label: string;
  readonly actor: string;
  readonly createdAt: string;
  readonly details: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  dataset_created: 'Dataset created',
  dataset_updated: 'Dataset updated',
  dataset_deleted: 'Dataset deleted',
  dataset_review_submitted: 'Submitted for review',
  dataset_review_approved: 'Dataset approved',
  dataset_review_rejected: 'Dataset rejected',
  dataset_approved: 'Dataset approved',
  dataset_rejected: 'Dataset rejected',
  dataset_published: 'Dataset published',
  metadata_updated: 'Metadata updated',
  file_uploaded: 'File uploaded',
  file_previewed: 'File previewed',
  file_data_accessed: 'File accessed',
  file_downloaded: 'File downloaded',
};

export function mapAuditLog(log: BackendAuditLog): AdminAuditEntry {
  return {
    key: log.id,
    label: humanizeAuditAction(log.action),
    actor: log.actor_email ?? 'System',
    createdAt: log.created_at,
    details: summarizeAuditDetails(log.details),
  };
}

export function sortAuditLogsByNewest(
  entries: AdminAuditEntry[],
): AdminAuditEntry[] {
  return [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function humanizeAuditAction(action: string): string {
  return (
    ACTION_LABELS[action] ??
    action
      .replaceAll(/[_-]+/g, ' ')
      .replaceAll(/\b\w/g, (char) => char.toUpperCase())
  );
}

function summarizeAuditDetails(
  details?: Record<string, unknown>,
): string | null {
  if (!details) {
    return null;
  }
  const parts = Object.entries(details)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(
      ([key, value]) => `${key.replaceAll('_', ' ')}: ${stringifyValue(value)}`,
    );
  return parts.length > 0 ? parts.join(' · ') : null;
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}
