import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { IndicatorAdapter } from '@app/features/explore/adapters/indicator-adapter.interface';
import { MOCK_INDICATORS } from '@app/features/explore/data/mock-indicators';
import { ExploreIndicator, RegionalValue } from '@app/features/explore/models/explore.model';
import { GeoChartQuery } from '@app/features/explore/utils/census-geo.util';

@Injectable()
export class MockIndicatorAdapter implements IndicatorAdapter {
  list(): Observable<ExploreIndicator[]> {
    return of(structuredClone(MOCK_INDICATORS));
  }

  getPlaces(
    _fileId: string,
    _query: GeoChartQuery,
  ): Observable<RegionalValue[]> {
    return of([]);
  }
}
