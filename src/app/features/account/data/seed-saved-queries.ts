import { SavedQueryItem } from '@app/features/account/models/account.model';

export const SEED_SAVED_QUERIES: SavedQueryItem[] = [
  {
    id: 'q-1',
    label: 'Population in Dodoma',
    query: 'population growth in Dodoma from 2010 to 2022',
    savedAt: '2026-05-14',
  },
  {
    id: 'q-2',
    label: 'Inflation trends',
    query: 'monthly inflation and consumer price index',
    savedAt: '2026-05-15',
  },
  {
    id: 'q-3',
    label: 'GDP quarterly',
    query: 'quarterly GDP national accounts Tanzania',
    savedAt: '2026-05-16',
  },
];
