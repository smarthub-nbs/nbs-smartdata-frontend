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

  it('infers chart fields from file columns before requesting chart data', () => {
    api.get.and.callFake(((url: string) => {
      if (url.includes('/data/')) {
        return of({
          file_id: 'file-1',
          filename: 'climate.csv',
          file_format: 'csv',
          columns: [
            'region',
            'year',
            'month',
            'rainfall_mm',
            'avg_temperature_c',
          ],
          rows: [
            {
              region: 'Dodoma',
              year: 2020,
              month: 'Jan',
              rainfall_mm: 12.5,
              avg_temperature_c: 24.1,
            },
          ],
          offset: 0,
          limit: 25,
          returned_rows: 1,
          total_rows: 12,
        });
      }

      return of({
        chart_type: 'line',
        series: [
          {
            name: 'sum of rainfall_mm',
            points: [{ label: 'Jan', x: 'Jan', y: 12.5, value: 12.5 }],
          },
        ],
      });
    }) as ApiService['get']);

    let previewLabel = '';
    service
      .getFileChart('file-1', { chartType: 'line' })
      .subscribe((preview) => {
        previewLabel = preview.label;
      });

    expect(api.get).toHaveBeenCalledWith('/v1/dataset/files/file-1/data/', {
      offset: '0',
      limit: '25',
    });
    expect(api.get).toHaveBeenCalledWith('/v1/dataset/files/file-1/chart/', {
      chart_type: 'line',
      limit: '12',
      x_field: 'month',
      y_field: 'rainfall_mm',
      metric: 'sum',
    });
    expect(previewLabel).toBe('sum of rainfall_mm');
  });

  it('infers TISP census columns for a bar chart', () => {
    api.get.and.callFake(((url: string) => {
      if (url.includes('/data/')) {
        return of({
          file_id: 'file-tisp',
          filename: 'population-size-2022.json',
          file_format: 'json',
          columns: [
            'indicator_name',
            'area_name',
            'area_code',
            'area_level',
            'time_name',
            'data_value',
          ],
          rows: [
            {
              indicator_name: 'Population size',
              area_name: 'Tanzania',
              area_code: 'TZ',
              area_level: 'LVL1',
              time_name: '2022',
              data_value: 61741120,
            },
          ],
          offset: 0,
          limit: 25,
          returned_rows: 1,
          total_rows: 4804,
        });
      }

      return of({
        chart_type: 'bar',
        series: [
          {
            name: 'sum of data_value',
            points: [
              {
                label: 'Tanzania',
                x: 'Tanzania',
                y: 61741120,
                value: 61741120,
              },
            ],
          },
        ],
      });
    }) as ApiService['get']);

    service
      .getFileChart('file-tisp', { chartType: 'bar', sort: 'desc', limit: 12 })
      .subscribe();

    expect(api.get).toHaveBeenCalledWith('/v1/dataset/files/file-tisp/chart/', {
      chart_type: 'bar',
      limit: '12',
      x_field: 'area_name',
      y_field: 'data_value',
      metric: 'sum',
      sort: 'desc',
    });
  });

  it('uses area_name for line charts when time_name does not vary', () => {
    api.get.and.callFake(((url: string) => {
      if (url.includes('/data/')) {
        return of({
          file_id: 'file-tisp',
          filename: 'population-size-2022.json',
          file_format: 'json',
          columns: [
            'indicator_name',
            'area_name',
            'area_code',
            'time_name',
            'data_value',
          ],
          rows: [
            {
              indicator_name: 'Population size',
              area_name: 'Tanzania',
              area_code: 'TZ',
              time_name: '2022',
              data_value: 61741120,
            },
            {
              indicator_name: 'Population size',
              area_name: 'Dodoma',
              area_code: 'DOD',
              time_name: '2022',
              data_value: 3085625,
            },
          ],
          offset: 0,
          limit: 25,
          returned_rows: 2,
          total_rows: 4804,
        });
      }

      return of({
        chart_type: 'line',
        series: [{ name: 'sum of data_value', points: [] }],
      });
    }) as ApiService['get']);

    service
      .getFileChart('file-tisp', { chartType: 'line', limit: 12 })
      .subscribe();

    expect(api.get).toHaveBeenCalledWith('/v1/dataset/files/file-tisp/chart/', {
      chart_type: 'line',
      limit: '12',
      x_field: 'area_name',
      y_field: 'data_value',
      metric: 'sum',
      sort: 'desc',
    });
  });
});
