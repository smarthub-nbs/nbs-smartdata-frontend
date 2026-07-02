import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Dataset } from '@app/features/discovery/models/dataset.model';
import { DatasetService } from '@app/features/discovery/services/dataset.service';
import { SmartSearchService } from '@app/features/search/services/smart-search.service';
import { TispSearchService } from '@app/features/search/services/tisp-search.service';

const gdpDataset: Dataset = {
  id: 'gdp-national-accounts',
  title: 'Gross Domestic Product — quarterly national accounts',
  description: 'Quarterly GDP at current and constant prices.',
  topicSlug: 'economy',
  topicName: 'Economy & labour',
  format: 'JSON',
  frequency: 'Quarterly',
  region: 'National',
  keywords: ['gdp', 'national accounts'],
  publisher: 'NBS',
  updatedAt: '2025-02-10',
  recordCount: 100,
  license: 'Open Government Licence - Tanzania',
};

const censusDataset: Dataset = {
  id: 'population-census',
  title: 'Population and housing census',
  description: 'Census tables by age and region.',
  topicSlug: 'census',
  topicName: 'Census',
  format: 'CSV',
  frequency: 'Annual',
  region: 'National',
  keywords: ['census'],
  publisher: 'NBS',
  updatedAt: '2025-03-10',
  recordCount: 250,
  license: 'Open Government Licence - Tanzania',
};

const tispPopulationDataset: Dataset = {
  id: 'external-tisp-census-population-tz-2022',
  title: 'Population size in Tanzania (2022)',
  description:
    'TISP census data reports 61,741,120 for Tanzania in 2022. Area level: LVL1.',
  topicSlug: 'population',
  topicName: 'Population',
  format: 'JSON',
  frequency: 'Annual',
  region: 'National',
  keywords: ['TISP', 'census', 'population', 'Tanzania', '2022'],
  publisher: 'National Bureau of Statistics',
  updatedAt: '2026-07-02',
  recordCount: 1,
  license: 'Official NBS public data',
  sourceUrl: 'https://tisp.nbs.go.tz:8000/census/dmdata/',
  dataSummary: 'Population size in Tanzania was 61,741,120 in 2022.',
};

describe('SmartSearchService', () => {
  let service: SmartSearchService;
  let datasetService: jasmine.SpyObj<DatasetService>;
  let tispSearchService: jasmine.SpyObj<TispSearchService>;

  beforeEach(() => {
    datasetService = jasmine.createSpyObj('DatasetService', ['searchCatalog']);
    datasetService.searchCatalog.and.returnValue(of([gdpDataset]));
    tispSearchService = jasmine.createSpyObj('TispSearchService', ['search']);
    tispSearchService.search.and.returnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        SmartSearchService,
        { provide: DatasetService, useValue: datasetService },
        { provide: TispSearchService, useValue: tispSearchService },
      ],
    });

    service = TestBed.inject(SmartSearchService);
  });

  it('returns ranked results for economy-related queries', (done) => {
    service.smartSearch('gdp growth').subscribe((response) => {
      expect(response.query).toBe('gdp growth');
      expect(response.answer).toContain('closest match');
      expect(response.results.length).toBeGreaterThan(0);
      expect(response.results[0]?.dataset.id).toBe('gdp-national-accounts');
      expect(response.interpretation).toContain('Economy');
      done();
    });
  });

  it('returns census category datasets for census queries', (done) => {
    datasetService.searchCatalog.and.returnValue(of([censusDataset]));

    service.smartSearch('census').subscribe((response) => {
      expect(response.results.length).toBeGreaterThan(0);
      expect(response.results[0]?.dataset.id).toBe('population-census');
      expect(response.interpretation).toContain('Census');
      done();
    });
  });

  it('suggests economy indicators for GDP queries', (done) => {
    service.smartSearch('gdp').subscribe((response) => {
      expect(response.suggestedIndicators).toContain('GDP growth');
      done();
    });
  });

  it('builds a conversational answer from TISP data summaries', (done) => {
    datasetService.searchCatalog.and.returnValue(of([]));
    tispSearchService.search.and.returnValue(of([tispPopulationDataset]));

    service.smartSearch('population Tanzania 2022').subscribe((response) => {
      expect(response.answer).toContain(
        'Population size in Tanzania was 61,741,120 in 2022.',
      );
      expect(response.answerFacts).toEqual([
        'Population size in Tanzania was 61,741,120 in 2022.',
      ]);
      done();
    });
  });
});
