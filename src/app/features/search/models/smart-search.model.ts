import { Dataset } from '@app/features/discovery';

export interface SmartSearchResult {
  dataset: Dataset;
  relevanceScore: number;
  matchReason: string;
}

export interface SmartSearchResponse {
  query: string;
  interpretation: string;
  results: SmartSearchResult[];
  suggestedIndicators: string[];
}

export interface SearchExampleQuery {
  label: string;
  query: string;
}
