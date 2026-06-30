import { SelectOption } from '@shared/ui';

export const YEAR_MIN = 1900;

/** Backend accepts years up to the current calendar year plus this offset. */
export const YEAR_MAX_OFFSET = 1;

/** Builds descending year options (newest first) for dataset metadata pickers. */
export function buildYearOptions(
  anchorYear = new Date().getFullYear(),
  minYear = YEAR_MIN,
  maxOffset = YEAR_MAX_OFFSET,
): readonly SelectOption[] {
  const maxYear = anchorYear + maxOffset;
  const options: SelectOption[] = [];
  for (let year = maxYear; year >= minYear; year--) {
    options.push({ label: String(year), value: String(year) });
  }
  return options;
}

export const YEAR_OPTIONS: readonly SelectOption[] = buildYearOptions();
