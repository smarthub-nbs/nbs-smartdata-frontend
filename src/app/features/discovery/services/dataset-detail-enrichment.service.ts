import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from '@app/core/services/auth.service';
import {
  DatasetIndexingStatus,
  DatasetUpdateRecord,
} from '@app/features/discovery/models/dataset.model';
import { DatasetEnrichmentService } from '@app/features/discovery/services/dataset-enrichment.service';
import { DatasetService } from '@app/features/discovery/services/dataset.service';

export interface DatasetEnrichmentState {
  history: DatasetUpdateRecord[];
  indexing: DatasetIndexingStatus | null;
}

@Injectable({ providedIn: 'root' })
export class DatasetDetailEnrichmentService {
  private readonly datasetService = inject(DatasetService);
  private readonly enrichment = inject(DatasetEnrichmentService);
  private readonly auth = inject(AuthService);

  loadForDatasetId(
    datasetId: string,
  ): Observable<DatasetEnrichmentState | null> {
    if (!datasetId) {
      return of(null);
    }

    const cached = this.datasetService.getById(datasetId);
    const dataset$ = this.datasetService
      .loadDatasetById(datasetId)
      .pipe(catchError(() => (cached ? of(cached) : of(null))));

    return dataset$.pipe(
      switchMap((dataset) => {
        if (!dataset) {
          return of(null);
        }

        return this.loadEnrichment(dataset.id);
      }),
    );
  }

  private loadEnrichment(
    datasetId: string,
  ): Observable<DatasetEnrichmentState> {
    const isAuthenticated = this.auth.isAuthenticated();

    return forkJoin({
      history: isAuthenticated
        ? this.enrichment
            .getUpdateHistory(datasetId)
            .pipe(catchError(() => of([])))
        : of([]),
      indexing: isAuthenticated
        ? this.enrichment
            .getIndexingStatus(datasetId)
            .pipe(catchError(() => of(null)))
        : of(null),
    }).pipe(
      map(({ history, indexing }) => ({
        history,
        indexing,
      })),
    );
  }
}
