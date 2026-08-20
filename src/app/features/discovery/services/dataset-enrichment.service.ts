import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import {
  DatasetChartPoint,
  DatasetChartPreview,
  DatasetFilePreview,
  DatasetIndexingStatus,
  DatasetPreviewSnapshot,
  DatasetUpdateRecord,
} from '@app/features/discovery/models/dataset.model';
import {
  OVERVIEW_FRAME,
  displayAreaName,
  geoChartQuery,
  hasCensusGeography,
  sortOverviewCards,
  yFieldName,
} from '@app/features/explore/utils/census-geo.util';

type PreviewCell = string | number | boolean | null;

interface BackendFileDataResponse {
  file_id: string;
  filename: string;
  file_format: string;
  columns?: string[];
  rows?: Record<string, PreviewCell>[];
  document?: {
    page_count?: number;
    pages?: {
      page_number: number;
      text: string;
    }[];
  };
  offset: number;
  limit: number;
  returned_rows: number;
  total_rows: number | null;
}

interface ChartFieldSelection {
  xField: string | null;
  yField: string | null;
  areaLevel?: string;
  keyField?: string;
  limit?: number;
}

export interface FilePreviewQuery {
  limit?: number;
  offset?: number;
  areaLevel?: string;
  parentCode?: string;
}

interface FileChartOptions {
  chartType?: 'line' | 'bar';
  sort?: 'asc' | 'desc';
  limit?: number;
  groupBy?: string;
  metric?: string;
  xField?: string;
  yField?: string;
  areaLevel?: string;
  parentCode?: string;
  areaCodePrefix?: string;
  keyField?: string;
}


const LINE_X_CANDIDATES = [
  'time_name',
  'month',
  'period',
  'date',
  'time',
  'year',
  'year_code',
] as const;
const BAR_X_CANDIDATES = [
  'area_name',
  'region',
  'country',
  'geo',
  'geography',
  'area',
  'district',
  'zone',
  'facility_type',
  'sector',
  'crop',
  'indicator',
  'service',
  'energy_source',
  'transport_mode',
  'visitor_origin',
  'education_level',
  'commodity',
  'age_group',
] as const;
const Y_CANDIDATES = ['data_value', 'datavalue', 'value', 'count'] as const;
const IDENTIFIER_COLUMN = /(_code|_level|_id|_key|_tag)$/i;

interface BackendStatusHistory {
  dataset?: string | { id: string };
  old_status: string;
  new_status: string;
  reason: string;
  changed_at: string;
}

interface BackendIndexingStatus {
  dataset?: string | { id: string };
  status: string;
  indexed_at: string;
  details: string;
}

interface BackendChartPoint {
  label?: string | number | null;
  x?: string | number | null;
  y?: string | number | null;
  value?: string | number | null;
  key?: string | number | null;
}

interface BackendChartSeries {
  name?: string;
  points: BackendChartPoint[];
}

interface BackendChartResponse {
  chart_type?: string;
  series: BackendChartSeries[];
}

@Injectable({ providedIn: 'root' })
export class DatasetEnrichmentService {
  private readonly api = inject(ApiService);

  getFilePreview(
    fileId: string,
    query: FilePreviewQuery = {},
  ): Observable<DatasetFilePreview> {
    const params: Record<string, string> = {
      offset: String(query.offset ?? 0),
      limit: String(query.limit ?? 10),
    };
    if (query.areaLevel) {
      params['area_level'] = query.areaLevel;
    }
    if (query.parentCode) {
      params['parent_code'] = query.parentCode;
    }
    return this.api
      .get<BackendFileDataResponse>(
        `/v1/dataset/files/${fileId}/data/`,
        params,
      )
      .pipe(map((response) => this.toFilePreview(response)));
  }

  getFileChart(
    fileId: string,
    options: FileChartOptions = {},
  ): Observable<DatasetChartPreview> {
    const chartType = options.chartType ?? 'line';

    return this.resolveChartFields(fileId, chartType, options).pipe(
      switchMap((fields) => {
        if (!fields.xField) {
          return of({
            chartType,
            label: 'Trend',
            points: [],
          } satisfies DatasetChartPreview);
        }

        const areaLevel = options.areaLevel ?? fields.areaLevel;
        return this.api
          .get<BackendChartResponse>(
            `/v1/dataset/files/${fileId}/chart/`,
            this.chartParams(chartType, fields, options, areaLevel),
          )
          .pipe(map((response) => this.toChartPreview(response, chartType)));
      }),
    );
  }

  getPreviewSnapshot(fileId: string): Observable<DatasetPreviewSnapshot> {
    return this.getFilePreview(fileId, { limit: 1 }).pipe(
      switchMap((preview) => {
        if (hasCensusGeography(preview.columns)) {
          const query = geoChartQuery(
            OVERVIEW_FRAME,
            yFieldName(preview.columns),
          );
          return this.getFileChart(fileId, {
            chartType: 'bar',
            xField: query.xField,
            yField: query.yField,
            metric: query.metric,
            keyField: query.keyField,
            areaLevel: query.areaLevel,
            limit: query.limit,
          }).pipe(
            map((chart) => ({
              kind: 'census' as const,
              label: chart.label,
              figures: sortOverviewCards(
                chart.points.map((point) => {
                  const key = point.key || point.label;
                  return {
                    key,
                    label: displayAreaName(point.label, key),
                    value: point.value,
                  };
                }),
              ),
              series: null,
            })),
          );
        }

        return this.getFileChart(fileId, { chartType: 'bar' }).pipe(
          map((chart) => ({
            kind: 'series' as const,
            label: chart.label,
            figures: [],
            series: chart,
          })),
        );
      }),
    );
  }

  private chartParams(
    chartType: 'line' | 'bar',
    fields: ChartFieldSelection,
    options: FileChartOptions,
    areaLevel?: string,
  ): Record<string, string> {
    const params: Record<string, string> = {
      chart_type: chartType,
      limit: String(options.limit ?? fields.limit ?? 12),
      x_field: fields.xField ?? '',
      metric: options.metric ?? (fields.yField ? 'sum' : 'count'),
    };
    if (options.sort) {
      params['sort'] = options.sort;
    }
    if (options.groupBy) {
      params['group_by'] = options.groupBy;
    }
    if (fields.yField) {
      params['y_field'] = fields.yField;
    }
    if (
      !options.sort &&
      fields.xField &&
      this.isGeographicField(fields.xField)
    ) {
      params['sort'] = 'desc';
    }
    const keyField = options.keyField ?? fields.keyField;
    if (keyField) {
      params['key_field'] = keyField;
    }
    if (areaLevel) {
      params['area_level'] = areaLevel;
    }
    if (options.parentCode) {
      params['parent_code'] = options.parentCode;
    }
    if (options.areaCodePrefix) {
      params['area_code_prefix'] = options.areaCodePrefix;
    }
    return params;
  }

  private resolveChartFields(
    fileId: string,
    chartType: 'line' | 'bar',
    options: Pick<FileChartOptions, 'xField' | 'yField'>,
  ): Observable<ChartFieldSelection> {
    if (options.xField) {
      return of({
        xField: options.xField,
        yField: options.yField ?? null,
      });
    }

    return this.api
      .get<BackendFileDataResponse>(`/v1/dataset/files/${fileId}/data/`, {
        offset: '0',
        limit: '25',
      })
      .pipe(
        map((preview) =>
          this.pickChartFields(
            preview.columns ?? [],
            preview.rows ?? [],
            chartType,
          ),
        ),
      );
  }

  private pickChartFields(
    columns: string[],
    rows: Record<string, PreviewCell>[],
    chartType: 'line' | 'bar',
  ): ChartFieldSelection {
    if (columns.length === 0) {
      return { xField: null, yField: null };
    }

    const preferred =
      chartType === 'bar' ? BAR_X_CANDIDATES : LINE_X_CANDIDATES;
    const fallback = chartType === 'bar' ? LINE_X_CANDIDATES : BAR_X_CANDIDATES;
    let xField =
      this.findColumn(columns, preferred) ??
      this.findColumn(columns, fallback) ??
      columns[0] ??
      null;

    if (xField && rows.length >= 2 && this.distinctCount(rows, xField) < 2) {
      const fallbackX = this.findColumn(columns, fallback);
      if (
        fallbackX &&
        fallbackX !== xField &&
        this.distinctCount(rows, fallbackX) >= 2
      ) {
        xField = fallbackX;
      }
    }

    const reserved = new Set(
      [...LINE_X_CANDIDATES, ...BAR_X_CANDIDATES].map((name) =>
        name.toLowerCase(),
      ),
    );
    const preferredY = this.findColumn(columns, Y_CANDIDATES);
    const yField =
      (preferredY && preferredY !== xField ? preferredY : null) ??
      columns.find((column) => {
        if (column === xField) {
          return false;
        }
        if (reserved.has(column.toLowerCase())) {
          return false;
        }
        if (IDENTIFIER_COLUMN.test(column)) {
          return false;
        }
        return rows.some((row) => this.isNumeric(row[column]));
      }) ??
      null;

    if (
      xField &&
      hasCensusGeography(columns) &&
      this.isGeographicField(xField)
    ) {
      const query = geoChartQuery(OVERVIEW_FRAME, yFieldName(columns));
      return {
        xField: this.findColumn(columns, [query.xField]) ?? xField,
        yField: this.findColumn(columns, [query.yField]) ?? yField,
        areaLevel: query.areaLevel,
        keyField: this.findColumn(columns, [query.keyField]) ?? undefined,
        limit: query.limit,
      };
    }

    return { xField, yField };
  }

  private isGeographicField(field: string): boolean {
    return (BAR_X_CANDIDATES as readonly string[]).includes(
      field.toLowerCase(),
    );
  }

  private distinctCount(
    rows: Record<string, PreviewCell>[],
    field: string,
  ): number {
    return new Set(rows.map((row) => String(row[field] ?? ''))).size;
  }

  private findColumn(
    columns: string[],
    candidates: readonly string[],
  ): string | null {
    for (const candidate of candidates) {
      const match = columns.find(
        (column) => column.toLowerCase() === candidate.toLowerCase(),
      );
      if (match) {
        return match;
      }
    }
    return null;
  }

  private isNumeric(value: PreviewCell | undefined): boolean {
    if (typeof value === 'number') {
      return Number.isFinite(value);
    }
    if (typeof value === 'boolean') {
      return true;
    }
    if (typeof value !== 'string' || value.trim() === '') {
      return false;
    }
    return Number.isFinite(Number.parseFloat(value));
  }

  getUpdateHistory(datasetId: string): Observable<DatasetUpdateRecord[]> {
    return this.api
      .get<BackendStatusHistory[]>('/v1/dataset/status-history/', {
        dataset: datasetId,
      })
      .pipe(
        map((entries) =>
          entries
            .filter((entry) => this.matchesDataset(entry.dataset, datasetId))
            .map((entry) => ({
              date: entry.changed_at,
              note: `${entry.old_status} → ${entry.new_status}: ${entry.reason}`,
            })),
        ),
      );
  }

  getIndexingStatus(
    datasetId: string,
  ): Observable<DatasetIndexingStatus | null> {
    return this.api
      .get<BackendIndexingStatus[]>('/v1/dataset/indexing-status/', {
        dataset: datasetId,
      })
      .pipe(
        map((entries) => {
          const latest = entries
            .filter((entry) => this.matchesDataset(entry.dataset, datasetId))
            .sort(
              (a, b) =>
                new Date(b.indexed_at).getTime() -
                new Date(a.indexed_at).getTime(),
            )[0];

          if (!latest) {
            return null;
          }

          return {
            status: latest.status,
            indexedAt: latest.indexed_at,
            details: latest.details,
          };
        }),
      );
  }

  private toChartPreview(
    response: BackendChartResponse,
    fallbackType: string,
  ): DatasetChartPreview {
    const series = response.series[0];
    const points = (series?.points ?? [])
      .map((point) => {
        const rawValue = point.y ?? point.value;
        const value =
          typeof rawValue === 'number'
            ? rawValue
            : Number.parseFloat(String(rawValue ?? ''));
        if (!Number.isFinite(value)) {
          return null;
        }
        const label = String(point.label ?? point.x ?? '');
        const mapped: DatasetChartPoint = {
          label: label || String(value),
          value,
        };
        if (point.key !== undefined && point.key !== null && point.key !== '') {
          mapped.key = String(point.key);
        }
        return mapped;
      })
      .filter((point): point is DatasetChartPoint => point !== null);

    return {
      chartType: response.chart_type ?? fallbackType,
      label: series?.name?.trim() || 'Trend',
      points,
    };
  }

  private toFilePreview(response: BackendFileDataResponse): DatasetFilePreview {
    if (response.columns && response.rows) {
      return {
        columns: response.columns,
        rows: response.rows,
        offset: response.offset,
        limit: response.limit,
        returnedRows: response.returned_rows,
        totalRows: response.total_rows,
      };
    }

    const pages = response.document?.pages ?? [];
    return {
      columns: pages.length > 0 ? ['Page', 'Text'] : [],
      rows: pages.map((page) => ({
        Page: page.page_number,
        Text: page.text,
      })),
      offset: response.offset,
      limit: response.limit,
      returnedRows: pages.length,
      totalRows: response.document?.page_count ?? response.total_rows,
    };
  }

  private matchesDataset(
    dataset: string | { id: string } | undefined,
    datasetId: string,
  ): boolean {
    if (!dataset) {
      return false;
    }
    return typeof dataset === 'string'
      ? dataset === datasetId
      : dataset.id === datasetId;
  }
}
