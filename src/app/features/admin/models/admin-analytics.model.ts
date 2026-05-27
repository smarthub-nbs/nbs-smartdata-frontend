export interface DatasetUsageRow {
  datasetId: string;
  title: string;
  topic: string;
  apiCalls: number;
  downloads: number;
  views: number;
  lastAccessed: string;
}

export interface UsageSummary {
  totalApiCalls: number;
  totalDownloads: number;
  totalViews: number;
}
