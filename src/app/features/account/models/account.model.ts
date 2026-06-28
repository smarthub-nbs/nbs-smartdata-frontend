import { UserRole } from '@app/core/models/user.model';

export interface SavedDatasetItem {
  datasetId: string;
  title: string;
  topic: string;
  savedAt: string;
}

export interface SavedQueryItem {
  id: string;
  label: string;
  query: string;
  savedAt: string;
}

export type PreferredLanguage = 'en' | 'sw';
export type ThemeMode = 'light' | 'system';

export interface AccountPreferences {
  language: PreferredLanguage;
  theme: ThemeMode;
  emailNotifications: boolean;
}

export interface AccountSnapshot {
  name: string;
  email: string;
  role: UserRole;
  initials: string;
  isVerified: boolean;
  savedDatasets: SavedDatasetItem[];
  savedQueries: SavedQueryItem[];
  preferences: AccountPreferences;
}
