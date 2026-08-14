export type GeoMacro = 'all' | 'mainland' | 'island';
export type GeoGrain =
  | 'overview'
  | 'region'
  | 'council'
  | 'division'
  | 'locality';
export type ValueField = 'data_value' | 'datavalue';

export const MAINLAND_PARENT_CODE = 'TZMAIN';
export const ISLAND_PARENT_CODE = 'TZ002';
export const NATIONAL_AREA_CODE = 'TZ';

export interface GeoPlace {
  key: string;
  label: string;
}

export interface GeoFrame {
  grain: GeoGrain;
  path: GeoPlace[];
  macro: GeoMacro;
}

export interface GeoChartQuery {
  xField: 'area_name';
  yField: ValueField;
  metric: 'sum';
  keyField: 'area_code';
  areaLevel: string;
  parentCode?: string;
  areaCodePrefix?: string;
  limit: number;
}

export const OVERVIEW_FRAME: GeoFrame = {
  grain: 'overview',
  path: [{ key: NATIONAL_AREA_CODE, label: 'Tanzania' }],
  macro: 'all',
};

export const GRAIN_LABEL: Record<GeoGrain, string> = {
  overview: 'National',
  region: 'Regions',
  council: 'Councils',
  division: 'Divisions',
  locality: 'Localities',
};

export const NEXT_GRAIN: Record<GeoGrain, GeoGrain | null> = {
  overview: 'region',
  region: 'council',
  council: 'division',
  division: 'locality',
  locality: null,
};

const NUMBER_FORMAT = new Intl.NumberFormat('en-TZ', {
  maximumFractionDigits: 0,
});

export function hasCensusGeography(columns: string[]): boolean {
  const names = new Set(columns.map((column) => column.toLowerCase()));
  return (
    names.has('area_level') &&
    names.has('area_name') &&
    (names.has('data_value') || names.has('datavalue'))
  );
}

export function yFieldName(columns: string[]): ValueField {
  const names = new Set(columns.map((column) => column.toLowerCase()));
  return names.has('datavalue') && !names.has('data_value')
    ? 'datavalue'
    : 'data_value';
}

export function displayAreaName(name: string, code: string): string {
  if (code === ISLAND_PARENT_CODE || name.trim().toLowerCase() === 'zanzibar') {
    return 'Island (Zanzibar)';
  }
  return name;
}

export function formatCensusNumber(value: number): string {
  return NUMBER_FORMAT.format(value);
}

export function currentPlace(frame: GeoFrame): GeoPlace {
  return (
    frame.path[frame.path.length - 1] ?? {
      key: NATIONAL_AREA_CODE,
      label: 'Tanzania',
    }
  );
}

function macroParentCode(macro: GeoMacro): string | undefined {
  if (macro === 'mainland') {
    return MAINLAND_PARENT_CODE;
  }
  if (macro === 'island') {
    return ISLAND_PARENT_CODE;
  }
  return undefined;
}

export function childGrainForAreaCode(areaCode: string): GeoGrain {
  const code = areaCode.trim();
  if (code === NATIONAL_AREA_CODE) {
    return 'region';
  }
  if (code === MAINLAND_PARENT_CODE || code === ISLAND_PARENT_CODE) {
    return 'region';
  }
  if (code.length <= 2) {
    return 'council';
  }
  if (code.length <= 5) {
    return 'division';
  }
  return 'locality';
}

export function geoChartQuery(frame: GeoFrame, yField: ValueField): GeoChartQuery {
  const base: Pick<GeoChartQuery, 'xField' | 'yField' | 'metric' | 'keyField'> =
    {
      xField: 'area_name',
      yField,
      metric: 'sum',
      keyField: 'area_code',
    };
  const parent = currentPlace(frame);

  switch (frame.grain) {
    case 'region':
      return {
        ...base,
        areaLevel: 'LVL3',
        parentCode: macroParentCode(frame.macro),
        limit: 40,
      };
    case 'council':
      return {
        ...base,
        areaLevel: 'LVL5',
        parentCode: parent.key,
        limit: 100,
      };
    case 'division':
      return {
        ...base,
        areaLevel: 'LVL6',
        parentCode: parent.key,
        limit: 100,
      };
    case 'locality':
      if (childGrainForAreaCode(parent.key) === 'division') {
        return {
          ...base,
          areaLevel: 'LVL7',
          areaCodePrefix: parent.key,
          limit: 100,
        };
      }
      return {
        ...base,
        areaLevel: 'LVL7',
        parentCode: parent.key,
        limit: 100,
      };
    default:
      return {
        ...base,
        areaLevel: 'LVL1,LVL2',
        limit: 12,
      };
  }
}

export function skipEmptyDivision(frame: GeoFrame): GeoFrame {
  if (frame.grain !== 'division') {
    return frame;
  }
  return { ...frame, grain: 'locality' };
}

export interface CensusPlaceQuery {
  query: GeoChartQuery;
  grain: GeoGrain;
}

/** Division first; if that grain is empty, localities under the council via prefix. */
export function censusPlaceQueries(
  frame: GeoFrame,
  yField: ValueField,
): CensusPlaceQuery[] {
  const primary: CensusPlaceQuery = {
    query: geoChartQuery(frame, yField),
    grain: frame.grain,
  };
  if (frame.grain !== 'division') {
    return [primary];
  }
  const fallbackFrame = skipEmptyDivision(frame);
  return [
    primary,
    {
      query: geoChartQuery(fallbackFrame, yField),
      grain: fallbackFrame.grain,
    },
  ];
}

export function drillInto(frame: GeoFrame, clicked: GeoPlace): GeoFrame {
  const labelled: GeoPlace = {
    key: clicked.key,
    label: displayAreaName(clicked.label, clicked.key),
  };

  if (frame.grain === 'overview') {
    const tanzania = frame.path[0] ?? OVERVIEW_FRAME.path[0];
    if (clicked.key === MAINLAND_PARENT_CODE) {
      return {
        grain: 'region',
        path: [tanzania, labelled],
        macro: 'mainland',
      };
    }
    if (clicked.key === ISLAND_PARENT_CODE) {
      return {
        grain: 'region',
        path: [tanzania, labelled],
        macro: 'island',
      };
    }
    return {
      grain: 'region',
      path: [tanzania],
      macro: 'all',
    };
  }

  const next = NEXT_GRAIN[frame.grain];
  if (!next) {
    return frame;
  }
  let macro = frame.macro;
  if (frame.grain === 'region' && macro === 'all') {
    macro = isIslandRegionCode(clicked.key) ? 'island' : 'mainland';
  }
  return {
    grain: next,
    path: [...frame.path, labelled],
    macro,
  };
}

export function frameForMacro(macro: GeoMacro): GeoFrame {
  const tanzania = OVERVIEW_FRAME.path[0];
  if (macro === 'mainland') {
    return {
      grain: 'region',
      path: [tanzania, { key: MAINLAND_PARENT_CODE, label: 'Mainland' }],
      macro,
    };
  }
  if (macro === 'island') {
    return {
      grain: 'region',
      path: [
        tanzania,
        { key: ISLAND_PARENT_CODE, label: 'Island (Zanzibar)' },
      ],
      macro,
    };
  }
  return {
    grain: 'region',
    path: [tanzania],
    macro: 'all',
  };
}

export function isIslandRegionCode(areaCode: string): boolean {
  const numeric = Number(areaCode.trim());
  return Number.isFinite(numeric) && numeric >= 51;
}

export type AreaFilterValue = 'national' | 'all' | 'mainland' | 'island';

export function areaFilterValue(frame: GeoFrame): AreaFilterValue {
  if (frame.grain === 'overview') {
    return 'national';
  }
  if (frame.macro === 'mainland') {
    return 'mainland';
  }
  if (frame.macro === 'island') {
    return 'island';
  }
  return 'all';
}

export function frameFromAreaFilter(value: AreaFilterValue): GeoFrame {
  if (value === 'national') {
    return OVERVIEW_FRAME;
  }
  if (value === 'mainland') {
    return frameForMacro('mainland');
  }
  if (value === 'island') {
    return frameForMacro('island');
  }
  return frameForMacro('all');
}

export function selectedRegionKey(frame: GeoFrame): string {
  const region = frame.path.find(
    (place) =>
      place.key !== NATIONAL_AREA_CODE &&
      place.key !== MAINLAND_PARENT_CODE &&
      place.key !== ISLAND_PARENT_CODE &&
      place.key.length <= 2,
  );
  return region?.key ?? '';
}

export function frameForRegion(region: GeoPlace, macro: GeoMacro): GeoFrame {
  let scope = macro;
  if (macro === 'all' && isIslandRegionCode(region.key)) {
    scope = 'island';
  }
  return drillInto(frameForMacro(scope), region);
}

export function regionsForMacro(
  regions: GeoPlace[],
  macro: GeoMacro,
): GeoPlace[] {
  if (macro === 'mainland') {
    return regions.filter((region) => !isIslandRegionCode(region.key));
  }
  if (macro === 'island') {
    return regions.filter((region) => isIslandRegionCode(region.key));
  }
  return regions;
}

export function canDrillGrain(grain: GeoGrain): boolean {
  return NEXT_GRAIN[grain] !== null;
}

export function overviewHint(code: string): string {
  if (code === MAINLAND_PARENT_CODE) {
    return 'View Mainland regions';
  }
  if (code === ISLAND_PARENT_CODE) {
    return 'View Island regions';
  }
  return 'View all regions';
}

export function sortOverviewCards<T extends { key: string }>(points: T[]): T[] {
  const order = [NATIONAL_AREA_CODE, MAINLAND_PARENT_CODE, ISLAND_PARENT_CODE];
  return [...points].sort((left, right) => {
    const leftIndex = order.indexOf(left.key);
    const rightIndex = order.indexOf(right.key);
    return (
      (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex)
    );
  });
}

export function serializeFrame(frame: GeoFrame): {
  area: AreaFilterValue;
  place: string | null;
} {
  const area = areaFilterValue(frame);
  const segments = frame.path
    .filter(
      (place) =>
        place.key !== NATIONAL_AREA_CODE &&
        place.key !== MAINLAND_PARENT_CODE &&
        place.key !== ISLAND_PARENT_CODE,
    )
    .map((place) => `${place.key}:${place.label}`);
  return { area, place: segments.length > 0 ? segments.join('/') : null };
}

export function parseFrame(
  areaRaw: string | null,
  placeRaw: string | null,
): GeoFrame {
  const area = parseAreaParam(areaRaw, placeRaw);

  if (area === 'national' && !placeRaw) {
    return OVERVIEW_FRAME;
  }

  let frame = frameFromAreaFilter(area === 'national' ? 'all' : area);
  if (!placeRaw) {
    return frame;
  }

  for (const segment of placeRaw.split('/')) {
    if (!segment) {
      continue;
    }
    const splitAt = segment.indexOf(':');
    const key = splitAt === -1 ? segment : segment.slice(0, splitAt);
    const label = splitAt === -1 ? segment : segment.slice(splitAt + 1);
    if (!key) {
      continue;
    }
    frame = drillInto(frame, { key, label });
  }
  return frame;
}

function parseAreaParam(
  areaRaw: string | null,
  placeRaw: string | null,
): AreaFilterValue {
  if (
    areaRaw === 'all' ||
    areaRaw === 'mainland' ||
    areaRaw === 'island' ||
    areaRaw === 'national'
  ) {
    return areaRaw;
  }
  if (placeRaw) {
    return 'all';
  }
  return 'national';
}

export function framesEqual(left: GeoFrame, right: GeoFrame): boolean {
  return (
    left.grain === right.grain &&
    left.macro === right.macro &&
    left.path.map((place) => place.key).join('>') ===
      right.path.map((place) => place.key).join('>')
  );
}

export function publicIndicatorLead(name: string, description: string): string {
  const ingestCopy = /TISP|area records/i.test(description);
  if (ingestCopy || !description.trim()) {
    const yearMatch = /(?:19|20)\d{2}/.exec(name);
    const year = yearMatch?.[0];
    if (/population size/i.test(name)) {
      return year
        ? `Total usual residents, ${year} Population and Housing Census.`
        : 'Total usual residents, Population and Housing Census.';
    }
    if (/literate/i.test(name)) {
      return year
        ? `Literacy status, ${year} Population and Housing Census.`
        : 'Literacy status from the Population and Housing Census.';
    }
    return 'Official figures for one administrative grain at a time.';
  }
  return description.trim();
}

export function displayMeasure(unit: string, name: string): string {
  if (unit === 'data_value' || unit === 'datavalue' || unit === 'count') {
    return /population/i.test(name) ? 'people' : 'count';
  }
  return unit;
}

export function breadcrumbLabels(frame: GeoFrame): { label: string; frame: GeoFrame | null }[] {
  if (frame.grain === 'overview') {
    return [{ label: 'National', frame: null }];
  }
  const crumbs: { label: string; frame: GeoFrame | null }[] = [
    { label: 'National', frame: OVERVIEW_FRAME },
  ];
  if (frame.macro === 'all' && frame.grain === 'region' && frame.path.length === 1) {
    crumbs.push({ label: 'All regions', frame: null });
    return crumbs;
  }
  frame.path.forEach((place, index) => {
    if (place.key === NATIONAL_AREA_CODE) {
      return;
    }
    const isLast = index === frame.path.length - 1;
    crumbs.push({
      label: place.label,
      frame: isLast
        ? null
        : {
            grain: childGrainForAreaCode(place.key),
            path: frame.path.slice(0, index + 1),
            macro: frame.macro,
          },
    });
  });
  return crumbs;
}
