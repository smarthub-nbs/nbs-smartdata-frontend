export interface DatasetUsageMetrics {
  datasetId: string;
  apiCalls: number;
  downloads: number;
  views: number;
  lastAccessed: string;
}

export interface DatasetUsageRow extends DatasetUsageMetrics {
  title: string;
  topic: string;
  resolved: boolean;
}

export interface UsageSummary {
  totalApiCalls: number;
  totalDownloads: number;
  totalViews: number;
}

export interface AdminDashboardUserSummary {
  total: number;
  active: number;
  inactive: number;
  verified: number;
  staff: number;
  superusers: number;
}

export interface AdminDashboardDatasetSummary {
  total: number;
  active: number;
  deleted: number;
  draft: number;
  in_review: number;
  approved: number;
  rejected: number;
  published: number;
}

export interface AdminDashboardApiSummary {
  consumers_total: number;
  consumers_active: number;
  api_keys_total: number;
  api_keys_active: number;
  api_keys_revoked: number;
  api_keys_expired: number;
  requests_total: number;
  requests_last_24h: number;
  error_requests_last_24h: number;
}

export interface AdminDashboardActivitySummary {
  dataset_audit_logs_total: number;
  api_usage_logs_total: number;
  last_24h_total: number;
}

export interface AdminDashboardSummary {
  users: AdminDashboardUserSummary;
  datasets: AdminDashboardDatasetSummary;
  api: AdminDashboardApiSummary;
  activity: AdminDashboardActivitySummary;
}

export interface AdminAnalyticsDatasetCount {
  dataset_id: string;
  dataset_slug: string | null;
  count: number;
}

export interface AdminApiCallsSummary {
  days: number;
  totals: {
    total_requests: number;
    success_requests: number;
    error_requests: number;
    unique_consumers: number;
    unique_api_keys: number;
    average_response_time_ms: number | null;
  };
  top_endpoints: {
    endpoint: string;
    method: string;
    request_count: number;
    error_count: number;
  }[];
}

export interface AdminDownloadsSummary {
  days: number;
  totals: {
    total_downloads: number;
    unique_datasets: number;
    unique_files: number;
    authenticated_downloads: number;
    anonymous_downloads: number;
  };
  top_datasets: AdminAnalyticsDatasetCount[];
}

export interface AdminViewsSummary {
  days: number;
  totals: {
    total_views: number;
    unique_datasets: number;
    unique_files: number;
    preview_views: number;
    data_views: number;
    schema_views: number;
  };
  top_datasets: AdminAnalyticsDatasetCount[];
}

export interface AdminActivityEntry {
  id: string;
  activity_type: string;
  action: string;
  created_at: string;
  actor_email: string | null;
  dataset_id: string | null;
  dataset_slug: string | null;
  target_model: string | null;
  target_id: string | null;
  endpoint: string | null;
  method: string | null;
  status_code: number | null;
  summary: string;
  details: Record<string, unknown> | null;
}

export interface AdminActivityListPayload {
  items: AdminActivityEntry[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
    next: string | null;
    previous: string | null;
  };
}

export interface AdminDatasetActivitySummary {
  days: number;
  totals: {
    total_events: number;
    unique_datasets: number;
    dataset_events: number;
    workflow_events: number;
    file_events: number;
    metadata_events: number;
    tag_events: number;
    version_events: number;
  };
  by_day: { date: string; total_events: number }[];
  by_action: { action: string; count: number }[];
  top_datasets: AdminAnalyticsDatasetCount[];
}
