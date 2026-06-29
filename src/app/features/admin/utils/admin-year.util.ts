import { SelectOption } from '@shared/ui';

export const YEAR_MIN = 1900;

/** Builds descending year options (newest first) for dataset metadata pickers. */
export function buildYearOptions(
  currentYear = new Date().getFullYear(),
  minYear = YEAR_MIN,
): readonly SelectOption[] {
  const options: SelectOption[] = [];
  for (let year = currentYear; year >= minYear; year--) {
    options.push({ label: String(year), value: String(year) });
  }
  return options;
}

export const YEAR_OPTIONS: readonly SelectOption[] = buildYearOptions();
