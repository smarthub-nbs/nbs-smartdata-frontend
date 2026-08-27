import { Observable } from 'rxjs';
import { ExploreIndicator, RegionalValue } from '@app/features/explore/models/explore.model';
import { GeoChartQuery } from '@app/features/explore/utils/census-geo.util';

export interface IndicatorAdapter {
  list(): Observable<ExploreIndicator[]>;
  getPlaces(fileId: string, query: GeoChartQuery): Observable<RegionalValue[]>;
}
