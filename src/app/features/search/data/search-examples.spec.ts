import { SEARCH_EXAMPLE_QUERIES } from '@app/features/search/data/search-examples';

describe('SEARCH_EXAMPLE_QUERIES', () => {
  it('offers supported regional population searches instead of placeholder topics', () => {
    expect(SEARCH_EXAMPLE_QUERIES.map((example) => example.label)).toEqual([
      'Population in Dodoma',
      'Arusha: women and men',
      'Population in Tanga',
      'Population in Zanzibar',
      'Population Pyramid by Age Group and Sex, Tanzania',
      'Dar es Salaam by sex',
      'Mwanza population source',
    ]);

    expect(
      SEARCH_EXAMPLE_QUERIES.some((example) =>
        /inflation|gdp|crop|school enrolment/i.test(example.label),
      ),
    ).toBeFalse();
    expect(
      SEARCH_EXAMPLE_QUERIES.every(
        (example) => example.query.trim().length > 0,
      ),
    ).toBeTrue();
  });
});
