import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Observable,
  catchError,
  filter,
  forkJoin,
  map,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import { Dataset } from '@app/features/discovery';

interface TispCensusRow {
  data_value: number | null;
  area_name: string;
  area_code: string;
  area_level: string;
  area_tag: number;
  time_name: string;
  parent_code: string | null;
  indicator_name: string;
}

interface TispDatavalueRow {
  data_value?: number | null;
  datavalue?: number | null;
  area_code?: string | null;
  area_level?: string | null;
  area_name: string;
  time_name: string;
  indicator_name: string;
  subgroupkey?: number | null;
  subgroup_name?: string | null;
  subgroup_code?: string | null;
  source_name?: string | null;
}

interface TispFilterPaneRow {
  indicatorkey: number;
  timeperiodkey: number;
  timeperiod_name: string;
  sectorkey: number;
  sector_name: string;
  sector_short_name?: string;
  subsectorkey: number;
  subsector_name: string;
  indicator_name: string;
  indicator_metadata?: string | null;
  tag?: number | null;
}

interface TispSubgroupOption {
  id: number;
  label: string;
}

interface TispSubgroupResponse {
  filter_options?: Record<string, TispSubgroupOption[]>;
  sub_group_map?: Record<string, number>;
}

interface TispSubgroup {
  subgroupkey: number;
  subgroupName: string;
}

interface KnownTispDatavalueLookup {
  matchTerms: string[];
  row: TispFilterPaneRow;
  subgroup: TispSubgroup;
}

interface CachedTispSearchResponse {
  datasets: Dataset[];
}

@Injectable({ providedIn: 'root' })
export class TispSearchService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);
  private readonly apiBaseUrl = '/tisp-api';
  private readonly sourceBaseUrl = 'https://tisp.nbs.go.tz:8000';

  private censusRows$?: Observable<TispCensusRow[]>;
  private filterRows$?: Observable<TispFilterPaneRow[]>;
  private readonly subgroupCache = new Map<
    number,
    Observable<TispSubgroup[]>
  >();
  private readonly knownSubgroups = new Map<number, TispSubgroup[]>([
    [189000, [{ subgroupkey: 1429736, subgroupName: 'Maize' }]],
  ]);
  private readonly knownDatavalueLookups: KnownTispDatavalueLookup[] = [
    {
      matchTerms: ['households', 'engaged', 'agriculture'],
      row: {
        indicatorkey: 189000,
        timeperiodkey: 1460469098,
        timeperiod_name: 'Every Ten year',
        sectorkey: 51,
        sector_name: 'Agriculture',
        sector_short_name: 'TZ_SEC_014',
        subsectorkey: 7995,
        subsector_name: 'Agriculture Engagement',
        indicator_name: 'Households engaged in agriculture, Number',
        indicator_metadata: null,
        tag: 0,
      },
      subgroup: { subgroupkey: 1429736, subgroupName: 'Maize' },
    },
  ];

  search(query: string): Observable<Dataset[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return of([]);
    }

    // The cache is fast and preserves previously fetched TISP responses, but
    // it is deliberately sparse. Fall back to the live TISP catalogue when a
    // query has not been cached yet (or when the cache endpoint is unavailable)
    // so search is not limited to the one seeded indicator.
    return this.searchBackendCache(query).pipe(
      switchMap((datasets) =>
        datasets.length ? of(datasets) : this.searchLiveTisp(normalized),
      ),
      catchError(() => this.searchLiveTisp(normalized)),
    );
  }

  private searchBackendCache(query: string): Observable<Dataset[]> {
    return this.api
      .post<CachedTispSearchResponse>('/v1/search/tisp-cache/', { query })
      .pipe(
        map((response) => response.datasets ?? []),
        catchError(() => of([])),
      );
  }

  private searchLiveTisp(normalized: string): Observable<Dataset[]> {
    const knownLookup = this.findKnownDatavalueLookup(normalized);
    if (knownLookup) {
      return this.searchKnownDatavalue(knownLookup);
    }

    return forkJoin({
      census: this.searchCensus(normalized),
      indicators: this.searchIndicators(normalized),
    }).pipe(
      map(({ census, indicators }) =>
        this.dedupe([...census, ...indicators]).slice(0, 30),
      ),
      catchError(() => of([])),
    );
  }

  private searchKnownDatavalue(
    lookup: KnownTispDatavalueLookup,
  ): Observable<Dataset[]> {
    return this.getDatavalues(lookup.row, lookup.subgroup).pipe(
      map((values) =>
        values.length
          ? [this.mapFilterRow(lookup.row, lookup.subgroup, values)]
          : [],
      ),
      catchError(() => of([])),
    );
  }

  private findKnownDatavalueLookup(
    query: string,
  ): KnownTispDatavalueLookup | null {
    return (
      this.knownDatavalueLookups.find((lookup) =>
        lookup.matchTerms.every((term) => query.includes(term)),
      ) ?? null
    );
  }

  private searchCensus(query: string): Observable<Dataset[]> {
    const tokens = this.tokenize(query);
    const years = this.extractYears(query);

    return this.getCensusRows().pipe(
      map((rows) =>
        rows
          .filter((row) => this.matchesCensus(row, tokens, years))
          .slice(0, 20)
          .map((row) => this.mapCensusRow(row)),
      ),
    );
  }

  private searchIndicators(query: string): Observable<Dataset[]> {
    const tokens = this.tokenize(query);

    return this.getFilterRows().pipe(
      map((rows) =>
        rows
          .map((row) => ({
            row,
            score: this.indicatorMatchScore(row, tokens, query),
          }))
          .filter((match) => match.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 12)
          .map((match) => match.row),
      ),
      switchMap((rows) => {
        if (rows.length === 0) {
          return of([]);
        }
        return forkJoin(
          rows.map((row) =>
            this.getSubgroups(row.indicatorkey).pipe(
              switchMap((subgroups) => {
                const selectedSubgroups = this.selectSubgroups(row, subgroups);
                return forkJoin(
                  selectedSubgroups.map((subgroup) =>
                    this.getDatavalues(row, subgroup).pipe(
                      map((values) => ({
                        values: this.filterDatavaluesForQuery(values, query),
                        subgroup,
                      })),
                      filter(({ values }) => values.length > 0),
                      map(({ values, subgroup: selectedSubgroup }) =>
                        this.mapFilterRow(row, selectedSubgroup, values),
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        ).pipe(map((groups) => groups.flat().slice(0, 20)));
      }),
    );
  }

  private getDatavalues(
    row: TispFilterPaneRow,
    subgroup: TispSubgroup | null,
  ): Observable<TispDatavalueRow[]> {
    const params = new URLSearchParams();
    params.set('tag', String(row.tag ?? 0));
    params.set('timeperiodkey', String(row.timeperiodkey));
    params.set('indicatorkey', String(row.indicatorkey));
    if (subgroup) {
      params.set('subgroupkey', String(subgroup.subgroupkey));
    }

    return this.http
      .get<unknown>(`${this.apiBaseUrl}/datavalue?${params}`)
      .pipe(
        map((values) =>
          Array.isArray(values)
            ? this.prioritizeDatavalues(values as TispDatavalueRow[]).slice(
                0,
                12,
              )
            : [],
        ),
        catchError(() => of([])),
      );
  }

  private getSubgroups(indicatorKey: number): Observable<TispSubgroup[]> {
    if (!this.subgroupCache.has(indicatorKey)) {
      this.subgroupCache.set(
        indicatorKey,
        this.http
          .get<TispSubgroupResponse>(
            `${this.apiBaseUrl}/subgroup/?indicatorkey=${indicatorKey}`,
          )
          .pipe(
            map((response) => this.mapSubgroupResponse(response)),
            catchError(() => of([])),
            shareReplay(1),
          ),
      );
    }
    return this.subgroupCache.get(indicatorKey)!;
  }

  private mapSubgroupResponse(response: TispSubgroupResponse): TispSubgroup[] {
    const options = Object.values(response.filter_options ?? {}).flat();
    return options
      .map((option) => {
        const subgroupkey = response.sub_group_map?.[`[${option.id}]`];
        if (!subgroupkey) {
          return null;
        }
        return {
          subgroupkey,
          subgroupName: option.label,
        };
      })
      .filter((subgroup): subgroup is TispSubgroup => subgroup !== null);
  }

  private selectSubgroups(
    row: TispFilterPaneRow,
    subgroups: TispSubgroup[],
  ): (TispSubgroup | null)[] {
    const knownSubgroups = this.knownSubgroups.get(row.indicatorkey) ?? [];
    const merged = [
      ...knownSubgroups,
      ...subgroups.filter(
        (subgroup) =>
          !knownSubgroups.some(
            (known) => known.subgroupkey === subgroup.subgroupkey,
          ),
      ),
    ];

    if (merged.length === 0) {
      return [null];
    }

    return merged.slice(0, 6);
  }

  private getCensusRows(): Observable<TispCensusRow[]> {
    this.censusRows$ ??= this.http
      .get<TispCensusRow[]>(`${this.apiBaseUrl}/census/dmdata/`)
      .pipe(
        catchError(() => of([])),
        shareReplay(1),
      );
    return this.censusRows$;
  }

  private getFilterRows(): Observable<TispFilterPaneRow[]> {
    this.filterRows$ ??= this.http
      .get<TispFilterPaneRow[]>(`${this.apiBaseUrl}/filterpanedim_no_subgroup`)
      .pipe(
        catchError(() => of([])),
        shareReplay(1),
      );
    return this.filterRows$;
  }

  private matchesCensus(
    row: TispCensusRow,
    tokens: string[],
    years: number[],
  ): boolean {
    const haystack = [
      row.indicator_name,
      row.area_name,
      row.area_code,
      row.area_level,
      row.time_name,
      'census',
      'population',
      'demography',
      'tisp',
    ]
      .join(' ')
      .toLowerCase();

    const matchesText = tokens.some((token) => haystack.includes(token));
    const matchesYear =
      years.length === 0 ||
      years.some((year) => row.time_name.includes(String(year)));

    return matchesText && matchesYear;
  }

  private indicatorMatchScore(
    row: TispFilterPaneRow,
    tokens: string[],
    query: string,
  ): number {
    const normalizedQuery = query.toLowerCase();
    const normalizedIndicator = row.indicator_name.toLowerCase();
    const haystack = [
      row.indicator_name,
      row.indicator_metadata ?? '',
      row.sector_name,
      row.subsector_name,
      row.timeperiod_name,
      'map',
      'services',
      'sensa',
      'tisp',
    ]
      .join(' ')
      .toLowerCase();

    let score = 0;
    const aliases: Record<string, string[]> = {
      cpi: ['consumer', 'price', 'index'],
      gdp: ['gross', 'domestic', 'product'],
      visitors: ['visitor'],
      enrollment: ['enrolment'],
      students: ['student'],
      households: ['household'],
      industries: ['industry'],
      licence: ['license'],
    };
    const meaningfulTokens = tokens
      .filter((token) => token !== 'number')
      .flatMap((token) => [token, ...(aliases[token] ?? [])]);

    if (
      normalizedQuery.length > 8 &&
      (normalizedIndicator.includes(normalizedQuery) ||
        normalizedQuery.includes(normalizedIndicator))
    ) {
      score += 120;
    }

    for (const token of meaningfulTokens) {
      if (normalizedIndicator.includes(token)) {
        score += 18;
      } else if (haystack.includes(token)) {
        score += 8;
      }
    }

    if (tokens.includes('number') && normalizedIndicator.includes('number')) {
      score += 5;
    }

    return score;
  }

  private mapCensusRow(row: TispCensusRow): Dataset {
    const indicator = this.cleanTitle(row.indicator_name);
    const area = this.cleanTitle(row.area_name);
    const value = this.formatValue(row.data_value);
    const topic = this.inferTopic(row.indicator_name);

    return {
      id: `external-tisp-census-${this.slug(`${indicator}-${row.area_code}-${row.time_name}`)}`,
      title: `${indicator} in ${area} (${row.time_name})`,
      description: `TISP census data reports ${value} for ${area} in ${row.time_name}. Area level: ${row.area_level}.`,
      topicSlug: topic.slug,
      topicName: topic.name,
      format: 'JSON',
      frequency: 'Annual',
      region: row.area_level === 'LVL1' ? 'National' : area,
      keywords: [
        'TISP',
        'census',
        'population',
        row.indicator_name,
        row.area_name,
        row.time_name,
      ],
      publisher: 'National Bureau of Statistics',
      updatedAt: '2026-07-02',
      recordCount: 1,
      license: 'Official NBS public data',
      sourceUrl: `${this.sourceBaseUrl}/census/dmdata/`,
      dataSummary: `${indicator} in ${area} was ${value} in ${row.time_name}.`,
    };
  }

  private mapFilterRow(
    row: TispFilterPaneRow,
    subgroup: TispSubgroup | null,
    values: TispDatavalueRow[],
  ): Dataset {
    const indicator = this.cleanTitle(row.indicator_name);
    const subgroupName = subgroup ? this.cleanTitle(subgroup.subgroupName) : '';
    const topic = this.inferTopic(
      `${row.sector_name} ${row.subsector_name} ${row.indicator_name}`,
    );
    const sourceUrl = new URL(`${this.sourceBaseUrl}/datavalue`);
    sourceUrl.searchParams.set('tag', String(row.tag ?? 0));
    sourceUrl.searchParams.set('timeperiodkey', String(row.timeperiodkey));
    sourceUrl.searchParams.set('indicatorkey', String(row.indicatorkey));
    if (subgroup) {
      sourceUrl.searchParams.set('subgroupkey', String(subgroup.subgroupkey));
    }

    const dataSummary = this.summarizeDatavalues(values);

    return {
      id: `external-tisp-indicator-${row.indicatorkey}-${row.timeperiodkey}-${subgroup?.subgroupkey ?? 'all'}`,
      title: subgroupName ? `${indicator} (${subgroupName})` : indicator,
      description: dataSummary
        ? `${row.sector_name} / ${row.subsector_name}. ${dataSummary}`
        : `${row.sector_name} / ${row.subsector_name}. Available from the TISP map and Sensa services APIs with ${row.timeperiod_name.toLowerCase()} time filters.`,
      topicSlug: topic.slug,
      topicName: topic.name,
      format: 'JSON',
      frequency: this.toFrequency(row.timeperiod_name),
      region: row.tag === 2 ? 'Zanzibar' : 'National',
      keywords: [
        'TISP',
        'Sensa',
        'map',
        'services',
        row.sector_name,
        row.subsector_name,
        row.indicator_name,
        subgroupName,
        row.timeperiod_name,
      ].filter(Boolean),
      publisher: 'National Bureau of Statistics',
      updatedAt: '2026-07-02',
      recordCount: values.length,
      license: 'Official NBS public data',
      sourceUrl: sourceUrl.toString(),
      dataSummary,
    };
  }

  private summarizeDatavalues(values: TispDatavalueRow[]): string {
    const facts = values
      .map((value) => {
        const numericValue = value.data_value ?? value.datavalue ?? null;
        if (numericValue === null || Number.isNaN(numericValue)) {
          return null;
        }
        const subgroup = value.subgroup_name
          ? ` for ${this.cleanTitle(value.subgroup_name)}`
          : '';
        return `${this.cleanTitle(value.indicator_name)}${subgroup} in ${this.cleanTitle(value.area_name)} was ${this.formatValue(numericValue)} in ${value.time_name}`;
      })
      .filter((fact): fact is string => fact !== null)
      .slice(0, 3);

    if (facts.length === 0) {
      return '';
    }
    return `${facts.join('; ')}.`;
  }

  private filterDatavaluesForQuery(
    values: TispDatavalueRow[],
    query: string,
  ): TispDatavalueRow[] {
    const normalizedQuery = query.toLowerCase();
    const knownAreas = [
      'tanzania',
      'mainland',
      'zanzibar',
      'arusha',
      'dar es salaam',
      'dodoma',
      'mwanza',
      'mbeya',
      'morogoro',
      'tanga',
      'simiyu',
      'mara',
      'kigoma',
      'kilimanjaro',
      'mara',
      'tabora',
      'iringa',
      'mtwara',
      'lindi',
      'pwani',
      'geita',
      'katavi',
      'rukwa',
      'singida',
      'shinyanga',
      'kagera',
      'njombe',
    ];
    const requestedAreas = knownAreas.filter((area) =>
      normalizedQuery.includes(area),
    );
    if (requestedAreas.length === 0) {
      return values;
    }

    const matchingRows = values.filter((value) => {
      const areaName = value.area_name.toLowerCase();
      const areaCode = value.area_code?.toLowerCase() ?? '';
      return requestedAreas.some(
        (area) => areaName === area || areaCode === area,
      );
    });

    return matchingRows;
  }

  private prioritizeDatavalues(values: TispDatavalueRow[]): TispDatavalueRow[] {
    const areaPriority = (value: TispDatavalueRow): number => {
      const areaCode = value.area_code?.toUpperCase();
      const areaName = value.area_name.toLowerCase();
      if (areaCode === 'TZ' || areaName === 'tanzania') {
        return 0;
      }
      if (areaCode === 'TZMAIN' || areaName === 'mainland') {
        return 1;
      }
      if (areaCode === 'TZ002' || areaName === 'zanzibar') {
        return 2;
      }
      if (value.area_level === 'LVL1') {
        return 3;
      }
      if (value.area_level === 'LVL2') {
        return 4;
      }
      return 5;
    };

    return [...values].sort((a, b) => {
      const priorityDiff = areaPriority(a) - areaPriority(b);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return a.area_name.localeCompare(b.area_name);
    });
  }

  private inferTopic(text: string): { slug: string; name: string } {
    const normalized = text.toLowerCase();
    if (/(population|census|demograph|household)/.test(normalized)) {
      return { slug: 'population', name: 'Population' };
    }
    if (
      /(gdp|econom|inflation|price|cpi|trade|labour|labor)/.test(normalized)
    ) {
      return { slug: 'economy', name: 'Economy & labour' };
    }
    if (/(agriculture|crop|maize|rice|livestock|food)/.test(normalized)) {
      return { slug: 'agriculture', name: 'Agriculture' };
    }
    if (/(health|hospital|clinic|dispensar)/.test(normalized)) {
      return { slug: 'health', name: 'Health' };
    }
    if (/(education|school|student|teacher)/.test(normalized)) {
      return { slug: 'education', name: 'Education' };
    }
    return { slug: 'official-statistics', name: 'Official statistics' };
  }

  private toFrequency(timeperiodName: string): Dataset['frequency'] {
    const normalized = timeperiodName.toLowerCase();
    if (normalized.includes('month')) {
      return 'Monthly';
    }
    if (normalized.includes('quarter')) {
      return 'Quarterly';
    }
    return 'Annual';
  }

  private tokenize(query: string): string[] {
    return query
      .split(/[\s,.;:!?()[\]'"-]+/)
      .map((token) => token.trim().toLowerCase())
      .filter((token) => token.length >= 3);
  }

  private extractYears(query: string): number[] {
    const matches = query.match(/\b(?:19|20)\d{2}\b/g) ?? [];
    return matches.map((match) => Number(match));
  }

  private cleanTitle(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private formatValue(value: number | null): string {
    if (value === null || Number.isNaN(value)) {
      return 'no value';
    }
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
    }).format(value);
  }

  private slug(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 90);
  }

  private dedupe(datasets: Dataset[]): Dataset[] {
    return [
      ...new Map(datasets.map((dataset) => [dataset.id, dataset])).values(),
    ];
  }
}
