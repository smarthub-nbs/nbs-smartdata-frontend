import { effect, Injectable, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthError, AuthService } from '@app/core/services/auth.service';
import {
  AccountPreferences,
  AccountSnapshot,
  SavedDatasetItem,
  SavedQueryItem,
} from '@app/features/account/models/account.model';
import { Dataset, DatasetService } from '@app/features/discovery';

const DEFAULT_PREFERENCES: AccountPreferences = {
  language: 'en',
  theme: 'system',
  emailNotifications: true,
};

const SAVED_DATASETS_STORAGE_PREFIX = 'nbs_saved_datasets_';

function savedDatasetsStorageKey(userId: string): string {
  return `${SAVED_DATASETS_STORAGE_PREFIX}${userId}`;
}

function readSavedDatasets(userId: string): SavedDatasetItem[] {
  const raw = localStorage.getItem(savedDatasetsStorageKey(userId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as SavedDatasetItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSavedDatasets(userId: string, items: SavedDatasetItem[]): void {
  localStorage.setItem(savedDatasetsStorageKey(userId), JSON.stringify(items));
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly auth = inject(AuthService);
  private readonly datasetService = inject(DatasetService);

  private readonly savedDatasets = signal<SavedDatasetItem[]>(
    this.loadSavedDatasetsForCurrentUser(),
  );
  private readonly savedQueries = signal<SavedQueryItem[]>([]);
  private readonly preferences =
    signal<AccountPreferences>(DEFAULT_PREFERENCES);

  readonly savedDatasetCount = computed(() => this.savedDatasets().length);
  readonly savedQueryCount = computed(() => this.savedQueries().length);
  readonly savedDatasetIds = computed(
    () => new Set(this.savedDatasets().map((item) => item.datasetId)),
  );

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
      initials: user.initials,
      isVerified: user.isVerified,
      savedDatasets: this.savedDatasetsForDisplay(),
      savedQueries: this.savedQueries(),
      preferences: this.preferences(),
    };
  });

  constructor() {
    effect(
      () => {
        const user = this.auth.user();
        this.savedDatasets.set(user ? readSavedDatasets(user.id) : []);
      },
      { allowSignalWrites: true },
    );
  }

  private loadSavedDatasetsForCurrentUser(): SavedDatasetItem[] {
    const user = this.auth.user();
    return user ? readSavedDatasets(user.id) : [];
  }

  isDatasetSaved(datasetId: string): boolean {
    return this.savedDatasets().some((item) => item.datasetId === datasetId);
  }

  addSavedDataset(dataset: Dataset): void {
    const user = this.auth.user();
    if (!user || this.isDatasetSaved(dataset.id)) {
      return;
    }

    const item: SavedDatasetItem = {
      datasetId: dataset.id,
      title: dataset.title,
      topic: dataset.topicName,
      savedAt: todayIsoDate(),
    };

    this.savedDatasets.update((items) => [...items, item]);
    this.persistSavedDatasets();
  }

  toggleSavedDataset(dataset: Dataset): void {
    if (this.isDatasetSaved(dataset.id)) {
      this.removeSavedDataset(dataset.id);
    } else {
      this.addSavedDataset(dataset);
    }
  }

  updateProfile(name: string): Observable<AuthError | null> {
    return this.auth.updateProfile({ name });
  }

  updatePreferences(update: Partial<AccountPreferences>): void {
    this.preferences.update((current) => ({ ...current, ...update }));
  }

  removeSavedDataset(datasetId: string): void {
    this.savedDatasets.update((items) =>
      items.filter((item) => item.datasetId !== datasetId),
    );
    this.persistSavedDatasets();
  }

  removeSavedQuery(id: string): void {
    this.savedQueries.update((items) => items.filter((item) => item.id !== id));
  }

  private persistSavedDatasets(): void {
    const user = this.auth.user();
    if (!user) {
      return;
    }
    writeSavedDatasets(user.id, this.savedDatasets());
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
