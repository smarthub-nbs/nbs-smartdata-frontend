import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '@app/core/services/auth.service';
import { SEED_SAVED_QUERIES } from '@app/features/account/data/seed-saved-queries';
import {
  AccountPreferences,
  AccountSnapshot,
  SavedDatasetItem,
} from '@app/features/account/models/account.model';
import { Dataset, DatasetService } from '@app/features/discovery';

const DEFAULT_PREFERENCES: AccountPreferences = {
  language: 'en',
  theme: 'system',
  emailNotifications: true,
};

function toSavedDatasetItems(datasets: Dataset[]): SavedDatasetItem[] {
  return datasets.map((dataset, index) => ({
    datasetId: dataset.id,
    title: dataset.title,
    topic: dataset.topicName,
    savedAt: `2026-05-${String(10 + index).padStart(2, '0')}`,
  }));
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly auth = inject(AuthService);
  private readonly datasetService = inject(DatasetService);

  private readonly savedDatasets = signal<SavedDatasetItem[]>(
    toSavedDatasetItems(this.datasetService.getSnapshot(3)),
  );

  private readonly savedQueries = signal(SEED_SAVED_QUERIES);

  private readonly preferences =
    signal<AccountPreferences>(DEFAULT_PREFERENCES);

  readonly savedDatasetCount = computed(() => this.savedDatasets().length);
  readonly savedQueryCount = computed(() => this.savedQueries().length);

  private readonly savedDatasetsForDisplay = computed(() =>
    this.savedDatasets().map((item) => this.enrichSavedDataset(item)),
  );

  readonly account = computed<AccountSnapshot | null>(() => {
    const user = this.auth.user();
    if (!user) {
      return null;
    }

    return {
      name: user.name,
      email: user.email,
      role: user.role,
      savedDatasets: this.savedDatasetsForDisplay(),
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

  private enrichSavedDataset(item: SavedDatasetItem): SavedDatasetItem {
    const dataset = this.datasetService.getById(item.datasetId);
    if (!dataset) {
      return item;
    }

    return {
      ...item,
      title: dataset.title,
      topic: dataset.topicName,
    };
  }
}
