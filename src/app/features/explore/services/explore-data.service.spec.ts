import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { INDICATOR_ADAPTER } from '@app/features/explore/adapters/indicator.adapter';
import { ExploreDataService } from '@app/features/explore/services/explore-data.service';
import {
  GeoChartQuery,
  drillInto,
  frameForMacro,
} from '@app/features/explore/utils/census-geo.util';

describe('ExploreDataService', () => {
  it('loads localities by prefix when divisions are empty', () => {
    const adapter = {
      list: () => of([]),
      getPlaces: jasmine
        .createSpy('getPlaces')
        .and.callFake((_fileId: string, query: GeoChartQuery) => {
          if (query.areaLevel === 'LVL6') {
            return of([]);
          }
          return of([
            { region: 'Kondoa Mjini', value: 4, key: '10105011' },
          ]);
        }),
    };

    TestBed.configureTestingModule({
      providers: [
        ExploreDataService,
        { provide: INDICATOR_ADAPTER, useValue: adapter },
      ],
    });

    const service = TestBed.inject(ExploreDataService);
    const frame = drillInto(
      drillInto(frameForMacro('all'), { key: '1', label: 'Dodoma' }),
      { key: '10105', label: 'Kondoa' },
    );

    let grain = '';
    let label = '';
    service
      .getCensusPlaces('file-1', frame, 'data_value')
      .subscribe((result) => {
        grain = result.grain;
        label = result.rows[0]?.region ?? '';
      });

    expect(adapter.getPlaces).toHaveBeenCalledTimes(2);
    expect(grain).toBe('locality');
    expect(label).toBe('Kondoa Mjini');
  });
});
