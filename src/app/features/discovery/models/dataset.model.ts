export type DatasetFormat =
  | 'CSV'
  | 'TSV'
  | 'TXT'
  | 'XLS'
  | 'XLSX'
  | 'JSON'
  | 'XML'
  | 'SDMX'
  | 'PDF'
  | 'ZIP';
export type DatasetFrequency = 'Annual' | 'Quarterly' | 'Monthly';
export type DatasetWorkflowStatus =
  'draft' | 'in_review' | 'approved' | 'rejected' | 'published';

export interface DatasetUpdateRecord {
  date: string;
  note: string;
}

export interface DatasetIndexingStatus {
  status: string;
  indexedAt: string;
  details: string;
}

export interface DatasetFilePreview {
  columns: string[];
  rows: Record<string, string | number | boolean | null>[];
  offset: number;
  limit: number;
  returnedRows: number;
  totalRows: number | null;
}

export interface Dataset {
  id: string;
  metadataId?: string | null;
  primaryFileId?: string | null;
  status?: DatasetWorkflowStatus;
  year?: number | null;
  title: string;
  description: string;
  topicSlug: string;
  topicName: string;
  format: DatasetFormat;
  frequency: DatasetFrequency;
  region: string;
  keywords: string[];
  publisher: string;
  updatedAt: string;
  recordCount: number;
  license: string;
}

export interface DatasetTopic {
  id: string;
  slug: string;
  name: string;
  description: string;
  datasetCount: number;
}

export interface DatasetFilters {
  query: string;
  topicSlug: string;
  format: string;
  frequency: string;
  region: string;
}

export const EMPTY_DATASET_FILTERS: DatasetFilters = {
  query: '',
  topicSlug: '',
  format: '',
  frequency: '',
  region: '',
};
