import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { DATASET_ADAPTER } from '@app/features/discovery/adapters/dataset.adapter';
import { DatasetAdapter } from '@app/features/discovery/adapters/dataset-adapter.interface';
import {
  Dataset,
  DatasetFilters,
  DatasetTopic,
} from '@app/features/discovery/models/dataset.model';
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
        provideHttpClient(),
        provideHttpClientTesting(),
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

  it('keeps detail metadata and primary file when a list refresh omits them', (done) => {
    const adapter = TestBed.inject(
      DATASET_ADAPTER,
    ) as jasmine.SpyObj<DatasetAdapter>;

    const detailed: Dataset = {
      ...dataset,
      metadataId: 'meta-1',
      primaryFileId: 'file-1',
      title: 'Monthly Climate Observations — Dodoma (2020)',
      region: 'Dodoma',
      publisher: 'Dataset Seeder',
      license: 'Open Data Commons ODbL',
      frequency: 'Quarterly',
      recordCount: 12,
    };

    adapter.getById.and.returnValue(of(detailed));
    service.loadDatasetById(detailed.id).subscribe();

    adapter.list.and.returnValue(
      of([
        {
          ...dataset,
          title: 'Climate Monthly Dodoma 2020',
          region: 'National',
          publisher: 'NBS',
        },
      ]),
    );
    service.refreshCatalog();

    setTimeout(() => {
      const merged = service.getById(detailed.id);
      expect(merged?.primaryFileId).toBe('file-1');
      expect(merged?.metadataId).toBe('meta-1');
      expect(merged?.title).toBe(
        'Monthly Climate Observations — Dodoma (2020)',
      );
      expect(merged?.region).toBe('Dodoma');
      expect(merged?.publisher).toBe('Dataset Seeder');
      expect(merged?.recordCount).toBe(12);
      done();
    }, 0);
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

  it('exposes only topics with published datasets in the filter list', () => {
    const adapter = TestBed.inject(
      DATASET_ADAPTER,
    ) as jasmine.SpyObj<DatasetAdapter>;
    const http = TestBed.inject(HttpTestingController);
    const topics: DatasetTopic[] = [
      {
        id: 'topic-population',
        slug: 'population',
        name: 'Population',
        description: '',
        datasetCount: 0,
      },
      {
        id: 'topic-health',
        slug: 'health',
        name: 'Health',
        description: '',
        datasetCount: 0,
      },
    ];

    adapter.listTopics.and.returnValue(of(topics));
    service.refreshCatalog();
    const tagRequests = http.match((request) =>
      request.url.includes('/v1/dataset/tags/'),
    );
    const activeRequest = tagRequests[tagRequests.length - 1];
    expect(activeRequest).toBeTruthy();
    activeRequest.flush([]);

    expect(service.topics().map((topic) => topic.slug)).toEqual(['population']);
  });

  it('does not apply stale catalog responses when a newer load supersedes it', (done) => {
    const adapter = TestBed.inject(
      DATASET_ADAPTER,
    ) as jasmine.SpyObj<DatasetAdapter>;
    adapter.list.calls.reset();

    const staleResponse = [{ ...dataset, id: 'stale', title: 'Stale' }];
    const freshResponse = [{ ...dataset, id: 'fresh', title: 'Fresh' }];
    const slowResponse$ = new Subject<Dataset[]>();

    adapter.list.and.callFake((filters: DatasetFilters) => {
      if (filters.region === 'Arusha') {
        return slowResponse$;
      }
      return of(freshResponse);
    });

    service.setFilters({ region: 'Arusha' });
    service.setFilters({ region: '' });

    setTimeout(() => {
      expect(service.listDatasets()[0]?.id).toBe('fresh');

      slowResponse$.next(staleResponse);
      slowResponse$.complete();

      expect(service.listDatasets()[0]?.id).toBe('fresh');
      done();
    }, 0);
  });
});
