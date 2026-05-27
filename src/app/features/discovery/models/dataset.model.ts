export type DatasetFormat = 'CSV' | 'XLSX' | 'JSON' | 'SDMX';
export type DatasetFrequency = 'Annual' | 'Quarterly' | 'Monthly';
export type DatasetQualityLevel = 'high' | 'medium' | 'low';

export interface DatasetUpdateRecord {
  date: string;
  note: string;
}

export interface Dataset {
  id: string;
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
  qualityScore: number;
  recordCount: number;
  license: string;
  updateHistory: DatasetUpdateRecord[];
}

export interface DatasetMetadataUpdate {
  title: string;
  description: string;
  topicSlug: string;
  format: DatasetFormat;
  frequency: DatasetFrequency;
  region: string;
  publisher: string;
  license: string;
  keywords: string[];
  qualityScore: number;
}

export interface DatasetTopic {
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
