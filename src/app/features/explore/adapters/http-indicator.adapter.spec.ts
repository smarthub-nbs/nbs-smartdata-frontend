import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { HttpIndicatorAdapter } from '@app/features/explore/adapters/http-indicator.adapter';
import { ExploreIndicator } from '@app/features/explore/models/explore.model';

describe('HttpIndicatorAdapter', () => {
  let adapter: HttpIndicatorAdapter;
  let api: jasmine.SpyObj<Pick<ApiService, 'get'>>;

  beforeEach(() => {
    api = jasmine.createSpyObj('ApiService', ['get']);
    api.get.and.returnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        HttpIndicatorAdapter,
        { provide: ApiService, useValue: api },
      ],
    });

    adapter = TestBed.inject(HttpIndicatorAdapter);
  });

  it('loads dataset details because the catalog list has no files', () => {
    api.get.and.callFake(((url: string) => {
      if (url === '/v1/dataset/') {
        return of([
          {
            id: 'dataset-1',
            slug: 'population-size-2022',
            category: { id: 'cat-1', name: 'Census', slug: 'census' },
          },
        ]);
      }

      if (url === '/v1/dataset/dataset-1/') {
        return of({
          id: 'dataset-1',
          slug: 'population-size-2022',
          category: { id: 'cat-1', name: 'Census', slug: 'census' },
          metadata: [
            {
              id: 'meta-1',
              title: 'Population size 2022',
              description: 'Census population',
              region: 'Tanzania',
            },
          ],
          versions: [
            {
              version_number: 1,
              files: [
                {
                  id: 'file-1',
                  filename: 'population-size-2022.json',
                  file_format: 'json',
                  is_primary: true,
                  is_safe: true,
                },
              ],
            },
          ],
        });
      }

      if (url.includes('/data/')) {
        return of({
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
        });
      }

      return of({
        series: [
          {
            name: 'sum of data_value',
            points: [
              {
                label: 'Tanzania',
                x: 'Tanzania',
                y: 61741120,
                value: 61741120,
                count: 1,
              },
            ],
          },
        ],
      });
    }) as ApiService['get']);

    let names: string[] = [];
    adapter.list().subscribe((indicators) => {
      names = indicators.map((indicator) => indicator.name);
    });

    expect(api.get).toHaveBeenCalledWith('/v1/dataset/dataset-1/');
    expect(api.get).toHaveBeenCalledWith('/v1/dataset/files/file-1/chart/', {
      chart_type: 'line',
      x_field: 'area_name',
      metric: 'sum',
      limit: '24',
      y_field: 'data_value',
      sort: 'desc',
    });
    expect(api.get).toHaveBeenCalledWith('/v1/dataset/files/file-1/chart/', {
      chart_type: 'bar',
      x_field: 'area_name',
      metric: 'sum',
      limit: '12',
      sort: 'desc',
      y_field: 'data_value',
    });
    expect(names).toEqual(['Population size 2022']);
  });

  it('loads census geography as national cards plus region ranking', () => {
    api.get.and.callFake(((url: string, params?: Record<string, string>) => {
      if (url === '/v1/dataset/') {
        return of([
          {
            id: 'dataset-1',
            slug: 'population-size-2022',
            category: { id: 'cat-1', name: 'Census', slug: 'census' },
          },
        ]);
      }

      if (url === '/v1/dataset/dataset-1/') {
        return of({
          id: 'dataset-1',
          slug: 'population-size-2022',
          category: { id: 'cat-1', name: 'Census', slug: 'census' },
          metadata: [
            {
              id: 'meta-1',
              title: 'Population size 2022',
              description: 'Census population',
              region: 'Tanzania',
            },
          ],
          versions: [
            {
              version_number: 1,
              files: [
                {
                  id: 'file-1',
                  filename: 'population-size-2022.json',
                  file_format: 'json',
                  is_primary: true,
                  is_safe: true,
                },
              ],
            },
          ],
        });
      }

      if (url.includes('/data/')) {
        return of({
          columns: [
            'area_name',
            'area_code',
            'area_level',
            'data_value',
          ],
          rows: [
            {
              area_name: 'Tanzania',
              area_code: 'TZ',
              area_level: 'LVL1',
              data_value: 61741120,
            },
          ],
        });
      }

      if (params?.['area_level'] === 'LVL1,LVL2') {
        return of({
          series: [
            {
              name: 'sum of data_value',
              points: [
                {
                  label: 'Tanzania',
                  x: 'Tanzania',
                  y: 61741120,
                  value: 61741120,
                  count: 1,
                  key: 'TZ',
                },
              ],
            },
          ],
        });
      }

      return of({
        series: [
          {
            name: 'sum of data_value',
            points: [
              {
                label: 'Dodoma',
                x: 'Dodoma',
                y: 3085625,
                value: 3085625,
                count: 1,
                key: '1',
              },
            ],
          },
        ],
      });
    }) as ApiService['get']);

    let indicator: ExploreIndicator | undefined;
    adapter.list().subscribe((indicators) => {
      indicator = indicators[0];
    });

    expect(api.get).toHaveBeenCalledWith('/v1/dataset/files/file-1/data/', {
      offset: '0',
      limit: '5',
    });
    expect(indicator?.kind).toBe('census-geo');
    expect(indicator?.yField).toBe('data_value');
    expect(indicator?.overview).toEqual([]);
    expect(indicator?.regional).toEqual([]);
  });

  it('loads one geographic grain for census place charts', () => {
    api.get.and.returnValue(
      of({
        series: [
          {
            name: 'sum of datavalue',
            points: [
              {
                label: 'Tanzania',
                x: 'Tanzania',
                y: 23058933,
                value: 23058933,
                count: 1,
                key: 'TZ',
              },
              {
                label: 'Mainland',
                x: 'Mainland',
                y: 22386041,
                value: 22386041,
                count: 1,
                key: 'TZMAIN',
              },
            ],
          },
        ],
      }),
    );

    let rows: { region: string; key?: string }[] = [];
    adapter
      .getPlaces('file-1', {
        xField: 'area_name',
        yField: 'datavalue',
        metric: 'sum',
        keyField: 'area_code',
        areaLevel: 'LVL1,LVL2',
        limit: 12,
      })
      .subscribe((places) => {
        rows = places;
      });

    expect(api.get).toHaveBeenCalledWith('/v1/dataset/files/file-1/chart/', {
      chart_type: 'bar',
      x_field: 'area_name',
      y_field: 'datavalue',
      metric: 'sum',
      key_field: 'area_code',
      area_level: 'LVL1,LVL2',
      limit: '12',
      sort: 'desc',
    });
    expect(rows.map((row) => row.key)).toEqual(['TZ', 'TZMAIN']);
  });

  it('returns an empty list when listed datasets have no files', () => {
    api.get.and.callFake(((url: string) => {
      if (url === '/v1/dataset/') {
        return of([{ id: 'dataset-1', slug: 'empty', category: null }]);
      }
      return of({
        id: 'dataset-1',
        slug: 'empty',
        category: null,
        versions: [],
      });
    }) as ApiService['get']);

    let count = -1;
    adapter.list().subscribe((indicators) => {
      count = indicators.length;
    });

    expect(count).toBe(0);
  });
});
