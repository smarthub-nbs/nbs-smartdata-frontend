import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { Dataset } from '@app/features/discovery';
import { TispSearchService } from '@app/features/search/services/tisp-search.service';

describe('TispSearchService', () => {
  let service: TispSearchService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj('ApiService', ['post']);
    TestBed.configureTestingModule({
      providers: [
        TispSearchService,
        provideHttpClient(),
        { provide: ApiService, useValue: api },
      ],
    });

    service = TestBed.inject(TispSearchService);
  });

  it('returns agriculture engagement values from the backend TISP cache', (done) => {
    const dataset: Dataset = {
      id: 'external-tisp-db-189000-1460469098-1429736',
      title: 'Households engaged in agriculture, Number (Maize)',
      description:
        'Agriculture / Agriculture Engagement. Households engaged in agriculture, Number for Maize in Tanzania was 5,404,117 in 2012.',
      topicSlug: 'agriculture',
      topicName: 'Agriculture',
      format: 'JSON',
      frequency: 'Annual',
      region: 'National',
      keywords: ['TISP', 'NBS', 'Agriculture', 'Maize'],
      publisher: 'National Bureau of Statistics',
      updatedAt: '2026-07-02',
      recordCount: 1,
      license: 'Official NBS public data',
      sourceUrl:
        'https://tisp.nbs.go.tz:8000/datavalue?tag=0&timeperiodkey=1460469098&indicatorkey=189000&subgroupkey=1429736',
      dataSummary:
        'Households engaged in agriculture, Number for Maize in Tanzania was 5,404,117 in 2012.',
    };
    api.post.and.returnValue(of({ datasets: [dataset] }));

    service
      .search('Households engaged in agriculture, Number')
      .subscribe((results) => {
        expect(api.post).toHaveBeenCalledWith('/v1/search/tisp-cache/', {
          query: 'Households engaged in agriculture, Number',
        });
        expect(results[0]?.dataSummary).toContain(
          'Households engaged in agriculture, Number for Maize in Tanzania was 5,404,117 in 2012.',
        );
        done();
      });
  });

});
