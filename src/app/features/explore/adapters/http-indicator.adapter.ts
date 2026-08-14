import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { IndicatorAdapter } from '@app/features/explore/adapters/indicator-adapter.interface';
import {
  ExploreIndicator,
  RegionalValue,
  TimeSeriesPoint,
} from '@app/features/explore/models/explore.model';

interface BackendCategory {
  id: string;
  name: string;
  slug: string;
}

interface BackendDatasetMetadata {
  id: string;
  title: string;
  description: string;
  region: string;
}

interface BackendDatasetFile {
  id: string;
  filename: string;
  file_format: string;
  is_primary: boolean;
  is_safe?: boolean;
}

interface BackendDatasetVersion {
  version_number: number | string;
  files?: BackendDatasetFile[];
}

interface BackendDataset {
  id: string;
  slug: string;
  category: BackendCategory | null;
  metadata?: BackendDatasetMetadata[];
  versions?: BackendDatasetVersion[];
}

type PreviewCell = string | number | boolean | null;

interface BackendFileDataResponse {
  columns?: string[];
  rows?: Record<string, PreviewCell>[];
}

interface ChartFieldSelection {
  xField: string | null;
  yField: string | null;
  regionField: string | null;
}

type ChartScalar = string | number | null;

interface BackendChartPoint {
  label?: string | null;
  x?: ChartScalar;
  y?: ChartScalar;
  value?: ChartScalar;
  count: number;
}

interface BackendChartSeries {
  name: string;
  points: BackendChartPoint[];
}

interface BackendChartResponse {
  series: BackendChartSeries[];
  warnings?: string[];
}

const MAX_INDICATORS = 8;
const TIME_FIELDS = [
  'time_name',
  'month',
  'period',
  'date',
  'time',
  'year',
  'year_code',
] as const;
const REGION_FIELDS = [
  'area_name',
  'region',
  'country',
  'geo',
  'geography',
  'area',
  'district',
  'zone',
] as const;
const Y_FIELDS = ['data_value', 'datavalue', 'value', 'count'] as const;
const IDENTIFIER_COLUMN = /(_code|_level|_id|_key|_tag)$/i;

@Injectable()
export class HttpIndicatorAdapter implements IndicatorAdapter {
  private readonly api = inject(ApiService);

  list(): Observable<ExploreIndicator[]> {
    return this.api.get<BackendDataset[]>('/v1/dataset/').pipe(
      switchMap((datasets) => {
        const ids = datasets.slice(0, MAX_INDICATORS).map((dataset) => dataset.id);
        if (ids.length === 0) {
          return of([]);
        }

        return forkJoin(
          ids.map((id) =>
            this.api
              .get<BackendDataset>(`/v1/dataset/${id}/`)
              .pipe(catchError(() => of(null))),
          ),
        );
      }),
      switchMap((details) => {
        const candidates = details
          .filter((dataset): dataset is BackendDataset => dataset !== null)
          .map((dataset) => ({
            dataset,
            fileId: this.resolvePrimaryFileId(dataset),
          }))
          .filter(
            (entry): entry is { dataset: BackendDataset; fileId: string } =>
              entry.fileId !== null,
          );

        if (candidates.length === 0) {
          return of([]);
        }

        return forkJoin(
          candidates.map(({ dataset, fileId }) =>
            this.buildIndicator(dataset, fileId).pipe(
              catchError(() => of(null)),
            ),
          ),
        ).pipe(
          map((indicators) =>
            indicators.filter(
              (indicator): indicator is ExploreIndicator => indicator !== null,
            ),
          ),
        );
      }),
    );
  }

  private buildIndicator(
    dataset: BackendDataset,
    fileId: string,
  ): Observable<ExploreIndicator | null> {
    return this.api
      .get<BackendFileDataResponse>(`/v1/dataset/files/${fileId}/data/`, {
        offset: '0',
        limit: '25',
      })
      .pipe(
        switchMap((preview) => {
          const columns = preview.columns ?? [];
          const rows = preview.rows ?? [];
          if (columns.length === 0) {
            return of(null);
          }

          const fields = this.pickFields(columns, rows);
          if (!fields.xField) {
            return of(null);
          }

          const lineX = fields.xField;
          const barX = fields.regionField ?? fields.xField;
          const lineParams: Record<string, string> = {
            chart_type: 'line',
            x_field: lineX,
            metric: fields.yField ? 'sum' : 'count',
            limit: '24',
          };
          if (fields.yField) {
            lineParams['y_field'] = fields.yField;
          }
          if (this.isRegionField(lineX)) {
            lineParams['sort'] = 'desc';
          }

          const barParams: Record<string, string> = {
            chart_type: 'bar',
            x_field: barX,
            metric: fields.yField ? 'sum' : 'count',
            limit: '12',
            sort: 'desc',
          };
          if (fields.yField) {
            barParams['y_field'] = fields.yField;
          }

          return forkJoin({
            line: this.api.get<BackendChartResponse>(
              `/v1/dataset/files/${fileId}/chart/`,
              lineParams,
            ),
            bar: this.api.get<BackendChartResponse>(
              `/v1/dataset/files/${fileId}/chart/`,
              barParams,
            ),
          }).pipe(
            map(({ line, bar }) => {
              const timeSeries = this.toTimeSeries(line);
              const regional = this.toRegional(bar);
              if (timeSeries.length === 0 && regional.length === 0) {
                return null;
              }

              const metadata = this.resolveMetadata(dataset.metadata);
              return {
                id: dataset.id,
                name: this.resolveTitle(metadata, dataset.slug),
                unit: fields.yField ?? 'count',
                description:
                  metadata?.description?.trim() ||
                  'Chart generated from the published dataset file.',
                topicSlug: dataset.category?.slug ?? 'uncategorized',
                timeSeries:
                  timeSeries.length > 0
                    ? timeSeries
                    : regional.map((point) => ({
                        label: point.region,
                        value: point.value,
                      })),
                regional:
                  regional.length > 0
                    ? regional
                    : timeSeries.map((point) => ({
                        region: point.label,
                        value: point.value,
                      })),
              } satisfies ExploreIndicator;
            }),
          );
        }),
      );
  }

  private pickFields(
    columns: string[],
    rows: Record<string, PreviewCell>[],
  ): ChartFieldSelection {
    let xField =
      this.findColumn(columns, TIME_FIELDS) ??
      this.findColumn(columns, REGION_FIELDS) ??
      columns[0] ??
      null;
    const regionField = this.findColumn(columns, REGION_FIELDS);

    if (xField && rows.length >= 2 && this.distinctCount(rows, xField) < 2) {
      const fallbackX = regionField;
      if (
        fallbackX &&
        fallbackX !== xField &&
        this.distinctCount(rows, fallbackX) >= 2
      ) {
        xField = fallbackX;
      }
    }

    const reserved = new Set(
      [...TIME_FIELDS, ...REGION_FIELDS].map((name) => name.toLowerCase()),
    );
    const preferredY = this.findColumn(columns, Y_FIELDS);
    const yField =
      (preferredY && preferredY !== xField ? preferredY : null) ??
      columns.find((column) => {
        if (column === xField || column === regionField) {
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

    return { xField, yField, regionField };
  }

  private toTimeSeries(chart: BackendChartResponse): TimeSeriesPoint[] {
    const points = chart.series[0]?.points ?? [];
    return points
      .map((point) => {
        const value = this.toNumber(point.value ?? point.y ?? point.count);
        if (value === null) {
          return null;
        }
        return {
          label: String(point.label ?? point.x ?? ''),
          value,
        };
      })
      .filter((point): point is TimeSeriesPoint => point !== null);
  }

  private toRegional(chart: BackendChartResponse): RegionalValue[] {
    const points = chart.series[0]?.points ?? [];
    return points
      .map((point) => {
        const value = this.toNumber(point.value ?? point.y ?? point.count);
        if (value === null) {
          return null;
        }
        return {
          region: String(point.label ?? point.x ?? ''),
          value,
        };
      })
      .filter((point): point is RegionalValue => point !== null);
  }

  private resolvePrimaryFileId(dataset: BackendDataset): string | null {
    const latestVersion = [...(dataset.versions ?? [])].sort(
      (a, b) => Number(b.version_number) - Number(a.version_number),
    )[0];
    if (!latestVersion?.files?.length) {
      return null;
    }

    const safeFiles = latestVersion.files.filter(
      (file) => file.is_safe !== false,
    );
    const pool = safeFiles.length > 0 ? safeFiles : latestVersion.files;
    const primary = pool.find((file) => file.is_primary) ?? pool[0];
    return primary?.id ?? null;
  }

  private resolveMetadata(
    records: BackendDatasetMetadata[] | undefined,
  ): BackendDatasetMetadata | undefined {
    if (!records?.length) {
      return undefined;
    }
    return (
      records.find(
        (record) => record.title?.trim() || record.description?.trim(),
      ) ?? records.at(-1)
    );
  }

  private resolveTitle(
    metadata: BackendDatasetMetadata | undefined,
    slug: string,
  ): string {
    const title = metadata?.title?.trim();
    if (title) {
      return title;
    }
    return (
      slug
        .split(/[-_]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Untitled dataset'
    );
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

  private distinctCount(
    rows: Record<string, PreviewCell>[],
    field: string,
  ): number {
    return new Set(rows.map((row) => String(row[field] ?? ''))).size;
  }

  private isRegionField(field: string): boolean {
    return REGION_FIELDS.includes(
      field.toLowerCase() as (typeof REGION_FIELDS)[number],
    );
  }

  private isNumeric(value: PreviewCell | undefined): boolean {
    return this.toNumber(value) !== null;
  }

  private toNumber(
    value: PreviewCell | string | number | null | undefined,
  ): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim().replaceAll(',', '');
    if (!normalized) {
      return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
