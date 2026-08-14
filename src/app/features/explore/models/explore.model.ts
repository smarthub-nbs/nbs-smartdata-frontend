export type ExploreChartType = 'line' | 'bar';
export type ExploreKind = 'census-geo' | 'time-series';

export interface TimeSeriesPoint {
  label: string;
  value: number;
}

export interface RegionalValue {
  region: string;
  value: number;
  key?: string;
}

export interface ExploreIndicator {
  id: string;
  name: string;
  unit: string;
  description: string;
  topicSlug: string;
  kind: ExploreKind;
  fileId?: string;
  yField?: 'data_value' | 'datavalue';
  overview: RegionalValue[];
  timeSeries: TimeSeriesPoint[];
  regional: RegionalValue[];
}
