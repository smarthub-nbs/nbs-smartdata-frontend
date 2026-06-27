import { SelectOption } from '@shared/ui';
import { DatasetFrequencyValue } from '@app/features/admin/models/admin-dataset.model';

export const FREQUENCY_OPTIONS: readonly SelectOption[] = [
  { label: 'Annual', value: 'annual' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Monthly', value: 'monthly' },
];

export function frequencyLabel(value: DatasetFrequencyValue): string {
  return (
    FREQUENCY_OPTIONS.find((option) => option.value === value)?.label ?? ''
  );
}
