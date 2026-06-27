import {
  DestroyRef,
  Injectable,
  Signal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { AuthService } from '@app/core/services/auth.service';
import {
  DatasetIndexingStatus,
  DatasetUpdateRecord,
} from '@app/features/discovery/models/dataset.model';
import { DatasetDetailEnrichmentService } from '@app/features/discovery/services/dataset-detail-enrichment.service';

@Injectable()
export class DatasetDetailFacadeService {
  private readonly detailEnrichment = inject(DatasetDetailEnrichmentService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly detailHistory = signal<DatasetUpdateRecord[]>([]);
  private readonly indexingStatus = signal<DatasetIndexingStatus | null>(null);
  private readonly historyLoading = signal(false);

  readonly history = this.detailHistory.asReadonly();
  readonly indexing = this.indexingStatus.asReadonly();
  readonly loading = this.historyLoading.asReadonly();
  readonly isAdmin = computed(() => this.auth.isAdmin());

  watchDatasetId(datasetId: Signal<string>): void {
    const authKey = computed(
      () => `${this.auth.isAuthenticated()}:${this.auth.isAdmin()}`,
    );

    combineLatest([
      toObservable(datasetId).pipe(distinctUntilChanged()),
      toObservable(authKey),
    ])
      .pipe(
        tap(([id]) => {
          if (!id) {
            this.reset();
            return;
          }
          this.historyLoading.set(!this.hasEnrichment());
        }),
        switchMap(([id]) =>
          id ? this.detailEnrichment.loadForDatasetId(id) : of(null),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => {
        if (!state) {
          this.reset();
          return;
        }

        this.detailHistory.set(state.history);
        this.indexingStatus.set(state.indexing);
        this.historyLoading.set(false);
      });
  }

  private reset(): void {
    this.detailHistory.set([]);
    this.indexingStatus.set(null);
    this.historyLoading.set(false);
  }

  private hasEnrichment(): boolean {
    return this.detailHistory().length > 0 || this.indexingStatus() !== null;
  }
}
