export type DatasetWorkflowStatus =
  'draft' | 'in_review' | 'approved' | 'rejected' | 'published';

export type StatusFilter = 'all' | DatasetWorkflowStatus;

/** Data scope for the workspace queue: all datasets (reviewer) or owned only. */
export type AdminQueueScope = 'all' | 'own';

export interface StatusCounts {
  all: number;
  draft: number;
  in_review: number;
  approved: number;
  rejected: number;
  published: number;
}

export const ADMIN_QUEUE_PAGE_SIZE = 10;

export const EMPTY_STATUS_COUNTS: StatusCounts = {
  all: 0,
  draft: 0,
  in_review: 0,
  approved: 0,
  rejected: 0,
  published: 0,
};

export const EMPTY_QUEUE_SUMMARY: AdminDatasetQueueSummary = {
  total: 0,
  draft: 0,
  in_review: 0,
  approved: 0,
  rejected: 0,
  published: 0,
};

export const EMPTY_QUEUE_PAGINATION: AdminDatasetQueuePagination = {
  page: 1,
  pageSize: ADMIN_QUEUE_PAGE_SIZE,
  totalPages: 1,
  totalItems: 0,
  hasNext: false,
  hasPrevious: false,
  next: null,
  previous: null,
};

export type DatasetFrequencyValue = 'annual' | 'quarterly' | 'monthly';

/** Matches `DatasetMetadata.title` max_length on the backend. */
export const METADATA_TITLE_MAX_LENGTH = 100;

export interface AdminDatasetDraft {
  categoryId: string;
  title: string;
  description: string;
  license: string;
  frequency: DatasetFrequencyValue;
  region: string;
  year: number;
  tagName: string;
}

export interface AdminDatasetMetadataForm {
  title: string;
  description: string;
  license: string;
  frequency: DatasetFrequencyValue;
  region: string;
  year: number | null;
}

export interface AdminDatasetMetadata extends AdminDatasetMetadataForm {
  metadataId: string | null;
  publisher: string;
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

export interface AdminDatasetQueueParams {
  q?: string;
  status?: DatasetWorkflowStatus;
  page?: number;
  pageSize?: number;
}

export interface AdminDatasetQueuePagination {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
  next: string | null;
  previous: string | null;
}

export interface AdminDatasetQueueResponse {
  items: AdminDatasetRecord[];
  pagination: AdminDatasetQueuePagination;
}

export interface AdminDatasetQueueSummary {
  total: number;
  draft: number;
  in_review: number;
  approved: number;
  rejected: number;
  published: number;
}

export interface BackendAdminQueueItem {
  id: string;
  slug: string;
  title: string | null;
  status: DatasetWorkflowStatus;
  visibility: boolean;
  category_slug: string | null;
  category_name: string | null;
  has_metadata: boolean;
  has_tag: boolean;
  has_file: boolean;
  primary_file_id: string | null;
  updated_at: string;
  created_at: string;
}

export interface BackendAdminQueuePagination {
  page: number;
  page_size: number;
  total_pages: number;
  total_items: number;
  has_next: boolean;
  has_previous: boolean;
  next: string | null;
  previous: string | null;
}

export interface BackendAdminQueueResponse {
  items: BackendAdminQueueItem[];
  pagination: BackendAdminQueuePagination;
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

export interface BackendAdminDatasetMetadata {
  id: string;
  title: string;
  description?: string;
  license?: string;
  frequency?: string;
  region?: string;
  year?: number | null;
  publisher_name?: string;
}

export interface BackendAdminDataset {
  id: string;
  slug: string;
  status: DatasetWorkflowStatus;
  visibility: boolean;
  category: BackendAdminCategory | null;
  metadata?: BackendAdminDatasetMetadata[];
  tags?: { id: string; name: string; slug: string }[];
  versions?: {
    version_number: number;
    files?: { id: string; is_primary: boolean }[];
  }[];
}

export interface AdminDatasetFile {
  id: string;
  filename: string;
  fileFormat: string;
  fileSize: number | null;
  isPrimary: boolean;
  validationStatus: string | null;
}

export interface AdminDatasetVersion {
  id: string;
  versionNumber: number;
  changelog: string;
}

export interface AdminDatasetTagLink {
  linkId: string;
  tagId: string;
  tagName: string;
  tagSlug: string;
}

export interface AdminDatasetResources {
  versions: AdminDatasetVersion[];
  files: AdminDatasetFile[];
  tagLinks: AdminDatasetTagLink[];
}

export interface BackendDatasetFile {
  id: string;
  filename: string;
  file_format: string;
  file_size: number | null;
  is_primary: boolean;
  validation_status: string | null;
  dataset_version: {
    id: string;
    version_number: number;
    dataset: { id: string } | null;
  } | null;
}

export interface BackendDatasetVersion {
  id: string;
  version_number: number;
  changelog: string;
  dataset: { id: string } | null;
}

export interface BackendDatasetTagLink {
  id: string;
  dataset: { id: string } | null;
  tag: { id: string; name: string; slug: string };
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
  dataset?: string | { id: string } | null;
  action: string;
  actor_email?: string | null;
  created_at: string;
  details: Record<string, unknown>;
}
