import {
  YEAR_MIN,
  YEAR_OPTIONS,
  buildYearOptions,
} from '@app/features/admin/utils/admin-year.util';

describe('admin-year.util', () => {
  it('builds descending year options from current year down to the minimum', () => {
    const options = buildYearOptions(2026, 2024);

    expect(options).toEqual([
      { label: '2026', value: '2026' },
      { label: '2025', value: '2025' },
      { label: '2024', value: '2024' },
    ]);
  });

  it('includes the configured minimum year in the default options', () => {
    const lastOption = YEAR_OPTIONS.at(-1);

    expect(lastOption?.value).toBe(String(YEAR_MIN));
  });
});
