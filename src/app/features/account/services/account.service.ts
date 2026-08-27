import {
  DestroyRef,
  Injectable,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, catchError, of } from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import { AuthError, AuthService } from '@app/core/services/auth.service';
import { ApiService } from '@app/core/services/api.service';
import { ToastService } from '@app/core/services/toast.service';
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

interface BackendCategory {
  id: string;
  name: string;
  slug: string;
}

interface BackendDatasetMetadata {
  title?: string;
  region?: string;
}

interface BackendBookmarkDataset {
  id: string;
  slug: string;
  category: BackendCategory | null;
  metadata?: BackendDatasetMetadata[];
}

interface BackendBookmark {
  id: string;
  created_at: string;
  dataset: BackendBookmarkDataset;
}

interface BackendBookmarkList {
  items: BackendBookmark[];
  pagination: {
    page: number;
    page_size: number;
    total_pages: number;
    total_items: number;
    has_next?: boolean;
    has_previous?: boolean;
  };
}

const BOOKMARK_PAGE_SIZE = 100;

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly datasetService = inject(DatasetService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly savedDatasets = signal<SavedDatasetItem[]>([]);
  private readonly bookmarksLoading = signal(false);
  private readonly bookmarksLoadingMore = signal(false);
  private readonly bookmarksPage = signal(1);
  private readonly bookmarksHasMore = signal(false);
  private readonly savedQueries = signal<SavedQueryItem[]>([]);
  private readonly preferences =
    signal<AccountPreferences>(DEFAULT_PREFERENCES);

  readonly savedDatasetCount = computed(() => this.savedDatasets().length);
  readonly savedQueryCount = computed(() => this.savedQueries().length);
  readonly savedDatasetIds = computed(
    () => new Set(this.savedDatasets().map((item) => item.datasetId)),
  );
  readonly bookmarksLoadingState = this.bookmarksLoading.asReadonly();
  readonly bookmarksLoadingMoreState = this.bookmarksLoadingMore.asReadonly();
  readonly bookmarksHasMoreState = this.bookmarksHasMore.asReadonly();

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
        if (!user) {
          this.savedDatasets.set([]);
          return;
        }
        this.refreshBookmarks();
      },
      { allowSignalWrites: true },
    );
  }

  isDatasetSaved(datasetId: string): boolean {
    return this.savedDatasets().some((item) => item.datasetId === datasetId);
  }

  addSavedDataset(dataset: Dataset): void {
    if (!this.auth.user() || this.isDatasetSaved(dataset.id)) {
      return;
    }

    const item: SavedDatasetItem = {
      datasetId: dataset.id,
      title: dataset.title,
      topic: dataset.topicName,
      savedAt: new Date().toISOString().slice(0, 10),
    };
    this.savedDatasets.update((items) => [item, ...items]);

    this.api
      .post<BackendBookmark>(`/v1/dataset/${dataset.id}/bookmark/`, {})
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error: unknown) => {
          this.savedDatasets.update((items) =>
            items.filter((entry) => entry.datasetId !== dataset.id),
          );
          this.toast.error(
            this.resolveErrorMessage(error, 'Could not save dataset.'),
          );
          return of(null);
        }),
      )
      .subscribe();
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
    const previous = this.savedDatasets();
    if (!previous.some((item) => item.datasetId === datasetId)) {
      return;
    }

    this.savedDatasets.update((items) =>
      items.filter((item) => item.datasetId !== datasetId),
    );

    this.api
      .delete<unknown>(`/v1/dataset/${datasetId}/bookmark/`)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error: unknown) => {
          this.savedDatasets.set(previous);
          this.toast.error(
            this.resolveErrorMessage(error, 'Could not remove saved dataset.'),
          );
          return of(null);
        }),
      )
      .subscribe();
  }

  removeSavedQuery(id: string): void {
    this.savedQueries.update((items) => items.filter((item) => item.id !== id));
  }

  refreshBookmarks(): void {
    if (!this.auth.user()) {
      this.savedDatasets.set([]);
      this.bookmarksPage.set(1);
      this.bookmarksHasMore.set(false);
      return;
    }

    this.bookmarksLoading.set(true);
    this.fetchBookmarkPage(1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.savedDatasets.set(
            response.items.map((bookmark) => this.toSavedDataset(bookmark)),
          );
          this.applyBookmarkPagination(response.pagination);
          this.bookmarksLoading.set(false);
        },
        error: (error: unknown) => {
          this.bookmarksLoading.set(false);
          this.toast.error(
            this.resolveErrorMessage(error, 'Could not load saved datasets.'),
          );
        },
      });
  }

  loadMoreBookmarks(): void {
    if (
      !this.auth.user() ||
      !this.bookmarksHasMore() ||
      this.bookmarksLoading() ||
      this.bookmarksLoadingMore()
    ) {
      return;
    }

    const nextPage = this.bookmarksPage() + 1;
    this.bookmarksLoadingMore.set(true);
    this.fetchBookmarkPage(nextPage)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const existing = new Set(
            this.savedDatasets().map((item) => item.datasetId),
          );
          const appended = response.items
            .map((bookmark) => this.toSavedDataset(bookmark))
            .filter((item) => !existing.has(item.datasetId));
          this.savedDatasets.update((items) => [...items, ...appended]);
          this.applyBookmarkPagination(response.pagination);
          this.bookmarksLoadingMore.set(false);
        },
        error: (error: unknown) => {
          this.bookmarksLoadingMore.set(false);
          this.toast.error(
            this.resolveErrorMessage(error, 'Could not load more datasets.'),
          );
        },
      });
  }

  private fetchBookmarkPage(page: number) {
    return this.api.get<BackendBookmarkList>('/v1/dataset/bookmarks/', {
      page: String(page),
      page_size: String(BOOKMARK_PAGE_SIZE),
    });
  }

  private applyBookmarkPagination(
    pagination: BackendBookmarkList['pagination'],
  ): void {
    this.bookmarksPage.set(pagination.page);
    const hasNext =
      pagination.has_next ?? pagination.page < pagination.total_pages;
    this.bookmarksHasMore.set(hasNext);
  }

  private toSavedDataset(bookmark: BackendBookmark): SavedDatasetItem {
    const metadata = bookmark.dataset.metadata?.find((record) =>
      record.title?.trim(),
    );
    const fromSlug = bookmark.dataset.slug
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    return {
      datasetId: bookmark.dataset.id,
      title: metadata?.title?.trim() || fromSlug || bookmark.dataset.slug,
      topic: bookmark.dataset.category?.name ?? 'Uncategorized',
      savedAt: bookmark.created_at.slice(0, 10),
    };
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

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return error.message || fallback;
    }
    if (error instanceof Error) {
      return error.message || fallback;
    }
    return fallback;
  }
}
