import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '@app/core/services/auth.service';
import { MOCK_DATASETS } from '@app/features/discovery/data/mock-datasets';
import { SEARCH_EXAMPLE_QUERIES } from '@app/features/search/data/search-examples';
import {
  AccountPreferences,
  AccountSnapshot,
  SavedDatasetItem,
  SavedQueryItem,
} from '@app/features/account/models/account.model';

const DEFAULT_PREFERENCES: AccountPreferences = {
  language: 'en',
  theme: 'system',
  emailNotifications: true,
};

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly auth = inject(AuthService);

  private readonly savedDatasets = signal<SavedDatasetItem[]>(
    MOCK_DATASETS.slice(0, 3).map((dataset, index) => ({
      datasetId: dataset.id,
      title: dataset.title,
      topic: dataset.topicName,
      savedAt: `2026-05-${String(10 + index).padStart(2, '0')}`,
    })),
  );

  private readonly savedQueries = signal<SavedQueryItem[]>(
    SEARCH_EXAMPLE_QUERIES.slice(0, 3).map((query, index) => ({
      id: `q-${index + 1}`,
      label: query.label,
      query: query.query,
      savedAt: `2026-05-${String(14 + index).padStart(2, '0')}`,
    })),
  );

  private readonly preferences =
    signal<AccountPreferences>(DEFAULT_PREFERENCES);

  readonly savedDatasetCount = computed(() => this.savedDatasets().length);
  readonly savedQueryCount = computed(() => this.savedQueries().length);
  readonly account = computed<AccountSnapshot | null>(() => {
    const user = this.auth.user();
    if (!user) {
      return null;
    }

    return {
      name: user.name,
      email: user.email,
      role: user.role,
      savedDatasets: this.savedDatasets(),
      savedQueries: this.savedQueries(),
      preferences: this.preferences(),
    };
  });

  updateProfile(name: string, email: string): void {
    this.auth.updateProfile({ name, email });
  }

  updatePreferences(update: Partial<AccountPreferences>): void {
    this.preferences.update((current) => ({ ...current, ...update }));
  }

  removeSavedDataset(datasetId: string): void {
    this.savedDatasets.update((items) =>
      items.filter((item) => item.datasetId !== datasetId),
    );
  }

  removeSavedQuery(id: string): void {
    this.savedQueries.update((items) => items.filter((item) => item.id !== id));
  }
}
