export type DatasetWorkflowStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'published';

export interface AdminDatasetDraft {
  categoryId: string;
  slug: string;
  title: string;
  description: string;
  license: string;
  frequency: 'annual' | 'quarterly' | 'monthly';
  region: string;
  year: number;
  tagName: string;
}

export interface AdminDatasetRecord {
  id: string;
  slug: string;
  status: DatasetWorkflowStatus;
  visibility: boolean;
  categorySlug: string | null;
  categoryName: string | null;
  title: string;
  hasMetadata: boolean;
  hasFile: boolean;
  hasTag: boolean;
  primaryFileId: string | null;
}

export interface BackendAdminCategory {
  id: string;
  name: string;
  slug: string;
}

export interface BackendAdminTag {
  id: string;
  name: string;
  slug: string;
}

export interface BackendAdminDataset {
  id: string;
  slug: string;
  status: DatasetWorkflowStatus;
  visibility: boolean;
  category: BackendAdminCategory | null;
  metadata?: Array<{ id: string; title: string }>;
  tags?: Array<{ id: string; name: string; slug: string }>;
  versions?: Array<{
    version_number: number;
    files?: Array<{ id: string; is_primary: boolean }>;
  }>;
}

export interface BackendStatusHistory {
  id: string;
  old_status: string;
  new_status: string;
  reason: string;
  changed_at: string;
}

export interface BackendAuditLog {
  id: string;
  action: string;
  created_at: string;
  details: Record<string, unknown>;
}
