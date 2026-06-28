import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Dataset } from '@app/features/discovery/models/dataset.model';
import { DatasetService } from '@app/features/discovery/services/dataset.service';
import { SmartSearchService } from '@app/features/search/services/smart-search.service';

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

describe('SmartSearchService', () => {
  let service: SmartSearchService;
  let datasetService: jasmine.SpyObj<DatasetService>;

  beforeEach(() => {
    datasetService = jasmine.createSpyObj('DatasetService', ['searchCatalog']);
    datasetService.searchCatalog.and.returnValue(of([gdpDataset]));

    TestBed.configureTestingModule({
      providers: [
        SmartSearchService,
        { provide: DatasetService, useValue: datasetService },
      ],
    });

    service = TestBed.inject(SmartSearchService);
  });

  it('returns ranked results for economy-related queries', (done) => {
    service.smartSearch('gdp growth').subscribe((response) => {
      expect(response.query).toBe('gdp growth');
      expect(response.results.length).toBeGreaterThan(0);
      expect(response.results[0]?.dataset.id).toBe('gdp-national-accounts');
      expect(response.interpretation).toContain('Economy');
      done();
    });
  });

  it('suggests economy indicators for GDP queries', (done) => {
    service.smartSearch('gdp').subscribe((response) => {
      expect(response.suggestedIndicators).toContain('GDP growth');
      done();
    });
  });
});
