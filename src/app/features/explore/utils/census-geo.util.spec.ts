import {
  OVERVIEW_FRAME,
  areaFilterValue,
  censusPlaceQueries,
  displayMeasure,
  drillInto,
  frameForMacro,
  geoChartQuery,
  hasCensusGeography,
  parseFrame,
  publicIndicatorLead,
  selectedRegionKey,
  serializeFrame,
  skipEmptyDivision,
} from '@app/features/explore/utils/census-geo.util';

describe('census-geo.util', () => {
  it('detects census geography columns', () => {
    expect(
      hasCensusGeography(['area_name', 'area_level', 'data_value']),
    ).toBeTrue();
    expect(hasCensusGeography(['year', 'rainfall_mm'])).toBeFalse();
  });

  it('requests one grain at a time', () => {
    expect(geoChartQuery(OVERVIEW_FRAME, 'data_value').areaLevel).toBe(
      'LVL1,LVL2',
    );
    expect(
      geoChartQuery(frameForMacro('mainland'), 'data_value'),
    ).toEqual(
      jasmine.objectContaining({
        areaLevel: 'LVL3',
        parentCode: 'TZMAIN',
      }),
    );
    expect(
      geoChartQuery(
        drillInto(frameForMacro('all'), { key: '1', label: 'Dodoma' }),
        'data_value',
      ),
    ).toEqual(
      jasmine.objectContaining({
        areaLevel: 'LVL5',
        parentCode: '1',
      }),
    );
  });

  it('drills council to divisions, then localities under that division', () => {
    const councils = drillInto(frameForMacro('all'), {
      key: '1',
      label: 'Dodoma',
    });
    const divisions = drillInto(councils, {
      key: '10105',
      label: 'Kondoa',
    });
    expect(geoChartQuery(divisions, 'data_value')).toEqual(
      jasmine.objectContaining({
        areaLevel: 'LVL6',
        parentCode: '10105',
      }),
    );

    const localities = drillInto(divisions, {
      key: '1010501',
      label: 'Kondoa Mjini',
    });
    expect(geoChartQuery(localities, 'data_value')).toEqual(
      jasmine.objectContaining({
        areaLevel: 'LVL7',
        parentCode: '1010501',
      }),
    );
  });

  it('falls back to localities by council prefix when divisions are empty', () => {
    const divisions = drillInto(
      drillInto(frameForMacro('all'), { key: '1', label: 'Dodoma' }),
      { key: '10105', label: 'Kondoa' },
    );
    const fallback = skipEmptyDivision(divisions);
    expect(fallback.grain).toBe('locality');
    expect(geoChartQuery(fallback, 'data_value')).toEqual(
      jasmine.objectContaining({
        areaLevel: 'LVL7',
        areaCodePrefix: '10105',
      }),
    );

    const queries = censusPlaceQueries(divisions, 'data_value');
    expect(queries.map((item) => item.grain)).toEqual([
      'division',
      'locality',
    ]);
  });

  it('maps drilled cards and table rows onto Area and Region filters', () => {
    const tanzania = drillInto(OVERVIEW_FRAME, {
      key: 'TZ',
      label: 'Tanzania',
    });
    expect(areaFilterValue(tanzania)).toBe('all');
    expect(selectedRegionKey(tanzania)).toBe('');

    const mainland = drillInto(OVERVIEW_FRAME, {
      key: 'TZMAIN',
      label: 'Mainland',
    });
    expect(areaFilterValue(mainland)).toBe('mainland');
    expect(selectedRegionKey(mainland)).toBe('');

    const island = drillInto(OVERVIEW_FRAME, {
      key: 'TZ002',
      label: 'Zanzibar',
    });
    expect(areaFilterValue(island)).toBe('island');
    expect(selectedRegionKey(island)).toBe('');

    const dodoma = drillInto(tanzania, { key: '1', label: 'Dodoma' });
    expect(areaFilterValue(dodoma)).toBe('mainland');
    expect(selectedRegionKey(dodoma)).toBe('1');
  });

  it('round-trips a drilled place through search params', () => {
    const dodoma = drillInto(
      drillInto(OVERVIEW_FRAME, { key: 'TZ', label: 'Tanzania' }),
      { key: '1', label: 'Dodoma' },
    );
    const params = serializeFrame(dodoma);
    expect(params.area).toBe('mainland');
    expect(params.place).toBe('1:Dodoma');
    const restored = parseFrame(params.area, params.place);
    expect(restored.grain).toBe('council');
    expect(restored.macro).toBe('mainland');
    expect(selectedRegionKey(restored)).toBe('1');
    expect(parseFrame(null, null).grain).toBe('overview');
  });

  it('rewrites ingest catalog copy into a public lead', () => {
    expect(
      publicIndicatorLead(
        'Population size (2022)',
        'Population size from the NBS TISP census map (2022). Tanzania was 61,741,120. 4804 area records.',
      ),
    ).toBe('Total usual residents, 2022 Population and Housing Census.');
    expect(displayMeasure('data_value', 'Population size (2022)')).toBe(
      'people',
    );
  });
});
