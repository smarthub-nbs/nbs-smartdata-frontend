import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '@app/core/services/auth.service';
import { Dataset } from '@app/features/discovery/models/dataset.model';
import { DatasetDetailEnrichmentService } from '@app/features/discovery/services/dataset-detail-enrichment.service';
import { DatasetEnrichmentService } from '@app/features/discovery/services/dataset-enrichment.service';
import { DatasetService } from '@app/features/discovery/services/dataset.service';

const dataset: Dataset = {
  id: 'dataset-1',
  title: 'Population',
  description: 'Population data',
  topicSlug: 'population',
  topicName: 'Population',
  format: 'CSV',
  frequency: 'Annual',
  region: 'National',
  keywords: ['population'],
  publisher: 'NBS',
  updatedAt: '2026-01-01',
  qualityScore: 95,
  recordCount: 10,
  license: 'Open',
  updateHistory: [],
};

describe('DatasetDetailEnrichmentService', () => {
  let service: DatasetDetailEnrichmentService;
  let auth: jasmine.SpyObj<Pick<AuthService, 'isAuthenticated' | 'isAdmin'>>;
  let enrichment: jasmine.SpyObj<
    Pick<
      DatasetEnrichmentService,
      'getUpdateHistory' | 'getAuditTrail' | 'getIndexingStatus'
    >
  >;

  beforeEach(() => {
    const datasetService: jasmine.SpyObj<
      Pick<DatasetService, 'getById' | 'loadDatasetById'>
    > = jasmine.createSpyObj('DatasetService', ['getById', 'loadDatasetById']);
    datasetService.getById.and.returnValue(dataset);
    datasetService.loadDatasetById.and.returnValue(of(dataset));

    auth = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'isAdmin']);
    auth.isAuthenticated.and.returnValue(false);
    auth.isAdmin.and.returnValue(false);

    enrichment = jasmine.createSpyObj('DatasetEnrichmentService', [
      'getUpdateHistory',
      'getAuditTrail',
      'getIndexingStatus',
    ]);
    enrichment.getUpdateHistory.and.returnValue(
      of([{ date: '2026-01-01', note: 'published' }]),
    );
    enrichment.getAuditTrail.and.returnValue(
      of([
        {
          action: 'published',
          actor: 'admin@nbs.gov',
          createdAt: '2026-01-01',
        },
      ]),
    );
    enrichment.getIndexingStatus.and.returnValue(
      of({ status: 'indexed', indexedAt: '2026-01-01', details: 'ok' }),
    );

    TestBed.configureTestingModule({
      providers: [
        DatasetDetailEnrichmentService,
        { provide: DatasetService, useValue: datasetService },
        { provide: AuthService, useValue: auth },
        { provide: DatasetEnrichmentService, useValue: enrichment },
      ],
    });

    service = TestBed.inject(DatasetDetailEnrichmentService);
  });

  it('returns empty enrichment for unauthenticated users', (done) => {
    service.loadForDatasetId(dataset.id).subscribe((state) => {
      expect(state).toEqual({
        history: [],
        audit: [],
        indexing: null,
      });
      expect(enrichment.getUpdateHistory).not.toHaveBeenCalled();
      expect(enrichment.getAuditTrail).not.toHaveBeenCalled();
      expect(enrichment.getIndexingStatus).not.toHaveBeenCalled();
      done();
    });
  });

  it('loads history, indexing, and audit for admins', (done) => {
    auth.isAuthenticated.and.returnValue(true);
    auth.isAdmin.and.returnValue(true);

    service.loadForDatasetId(dataset.id).subscribe((state) => {
      expect(state?.history).toEqual([
        { date: '2026-01-01', note: 'published' },
      ]);
      expect(state?.audit).toEqual([
        {
          action: 'published',
          actor: 'admin@nbs.gov',
          createdAt: '2026-01-01',
        },
      ]);
      expect(state?.indexing).toEqual({
        status: 'indexed',
        indexedAt: '2026-01-01',
        details: 'ok',
      });
      done();
    });
  });
});
