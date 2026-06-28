import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { DatasetEnrichmentService } from '@app/features/discovery/services/dataset-enrichment.service';

describe('DatasetEnrichmentService', () => {
  let service: DatasetEnrichmentService;
  let api: jasmine.SpyObj<Pick<ApiService, 'get'>>;

  beforeEach(() => {
    api = jasmine.createSpyObj('ApiService', ['get']);
    api.get.and.returnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        DatasetEnrichmentService,
        { provide: ApiService, useValue: api },
      ],
    });

    service = TestBed.inject(DatasetEnrichmentService);
  });

  it('requests status history scoped by dataset id', () => {
    service.getUpdateHistory('dataset-1').subscribe();

    expect(api.get).toHaveBeenCalledWith('/v1/dataset/status-history/', {
      dataset: 'dataset-1',
    });
  });

  it('requests indexing status scoped by dataset id', () => {
    service.getIndexingStatus('dataset-1').subscribe();

    expect(api.get).toHaveBeenCalledWith('/v1/dataset/indexing-status/', {
      dataset: 'dataset-1',
    });
  });
});
