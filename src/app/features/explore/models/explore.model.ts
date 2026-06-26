export type ExploreChartType = 'line' | 'bar';

export interface TimeSeriesPoint {
  label: string;
  value: number;
}

export interface RegionalValue {
  region: string;
  value: number;
}

export interface ExploreIndicator {
  id: string;
  name: string;
  unit: string;
  description: string;
  topicSlug: string;
  timeSeries: TimeSeriesPoint[];
  regional: RegionalValue[];
}
