import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TispSearchService } from '@app/features/search/services/tisp-search.service';

describe('TispSearchService', () => {
  let service: TispSearchService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TispSearchService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(TispSearchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('returns agriculture engagement values from the known crop subgroup', (done) => {
    service
      .search('Households engaged in agriculture, Number')
      .subscribe((results) => {
        const maizeResult = results.find((result) =>
          result.title.includes('Maize'),
        );

        expect(maizeResult?.dataSummary).toContain(
          'Households engaged in agriculture, Number for Maize in Tanzania was 5,404,117 in 2012.',
        );
        done();
      });

    httpMock
      .expectOne(
        (request) =>
          request.urlWithParams ===
          '/tisp-api/datavalue?tag=0&timeperiodkey=1460469098&indicatorkey=189000&subgroupkey=1429736',
      )
      .flush([
        {
          datavaluekey: 437549,
          area_level: 'LVL1',
          area_code: 'TZ',
          parent_code: null,
          area_name: 'Tanzania',
          tag: 0,
          areakey: 1236,
          indicatorkey: 189000,
          indicator_name: 'Households engaged in agriculture, Number',
          datavalue: 5404117.0,
          time_name: '2012',
          source_name: 'Population and Housing Census(PHC)_2012',
          source_mda: 'NBS & OCGS',
          source_link: null,
          timeperiod_name: 'Every Ten year',
          subgroupkey: 1429736,
          timeperiodkey: 1460469098,
          subgroup_name: 'Maize',
          subgroup_code: 'Maize',
        },
      ]);
  });
});
