import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DATASET_ADAPTER } from '@app/features/discovery/adapters/dataset.adapter';
import { DatasetAdapter } from '@app/features/discovery/adapters/dataset-adapter.interface';
import { Dataset } from '@app/features/discovery/models/dataset.model';
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
  recordCount: 10,
  license: 'Open',
};

describe('DatasetService', () => {
  let service: DatasetService;

  beforeEach(() => {
    const adapter = jasmine.createSpyObj('DatasetAdapter', [
      'list',
      'getById',
      'listTopics',
    ]) as jasmine.SpyObj<DatasetAdapter>;

    adapter.list.and.returnValue(of([{ ...dataset }]));
    adapter.listTopics.and.returnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        DatasetService,
        {
          provide: DATASET_ADAPTER,
          useValue: adapter,
        },
      ],
    });

    service = TestBed.inject(DatasetService);
    service.ensureCatalogLoaded();
  });

  it('patches record count from a valid preview total', () => {
    service.patchRecordCountFromPreview(dataset.id, 25);

    expect(service.getById(dataset.id)?.recordCount).toBe(25);
  });

  it('ignores null, zero, and unchanged preview totals', () => {
    service.patchRecordCountFromPreview(dataset.id, null);
    service.patchRecordCountFromPreview(dataset.id, 0);
    service.patchRecordCountFromPreview(dataset.id, dataset.recordCount);

    expect(service.getById(dataset.id)?.recordCount).toBe(dataset.recordCount);
  });

  it('refreshes the catalog only when marked stale', () => {
    const adapter = TestBed.inject(
      DATASET_ADAPTER,
    ) as jasmine.SpyObj<DatasetAdapter>;
    adapter.list.calls.reset();

    service.refreshCatalogIfStale();
    expect(adapter.list).not.toHaveBeenCalled();

    service.markCatalogStale();
    service.refreshCatalogIfStale();
    expect(adapter.list).toHaveBeenCalled();
  });
});
