import {
  YEAR_MAX_OFFSET,
  YEAR_MIN,
  YEAR_OPTIONS,
  buildYearOptions,
} from '@app/features/admin/utils/admin-year.util';

describe('admin-year.util', () => {
  it('builds descending year options through the backend max year offset', () => {
    const options = buildYearOptions(2026, 2024);

    expect(options).toEqual([
      { label: '2027', value: '2027' },
      { label: '2026', value: '2026' },
      { label: '2025', value: '2025' },
      { label: '2024', value: '2024' },
    ]);
  });

  it('includes the next calendar year by default to match backend validation', () => {
    const anchorYear = new Date().getFullYear();
    const options = buildYearOptions(anchorYear, anchorYear);

    expect(options[0]?.value).toBe(String(anchorYear + YEAR_MAX_OFFSET));
  });

  it('includes the configured minimum year in the default options', () => {
    const lastOption = YEAR_OPTIONS.at(-1);

    expect(lastOption?.value).toBe(String(YEAR_MIN));
  });
});
