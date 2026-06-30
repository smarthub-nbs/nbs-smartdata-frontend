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
