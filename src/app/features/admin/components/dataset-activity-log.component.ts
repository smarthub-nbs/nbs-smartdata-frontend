import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  Observable,
  catchError,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { AdminDatasetWorkflowService } from '@app/features/admin/services/admin-dataset-workflow.service';
import {
  AdminAuditEntry,
  mapAuditLog,
  sortAuditLogsByNewest,
} from '@app/features/admin/utils/audit-log.util';
import { IconComponent } from '@shared/ui';

type ActivityLoadState =
  | { status: 'loading' }
  | { status: 'success'; entries: AdminAuditEntry[] }
  | { status: 'error' };

@Component({
  selector: 'app-dataset-activity-log',
  standalone: true,
  imports: [DatePipe, IconComponent],
  templateUrl: './dataset-activity-log.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetActivityLogComponent {
  private readonly workflow = inject(AdminDatasetWorkflowService);
  private readonly destroyRef = inject(DestroyRef);

  readonly datasetId = input.required<string>();

  protected readonly expanded = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly entries = signal<AdminAuditEntry[]>([]);

  constructor() {
    toObservable(this.datasetId)
      .pipe(
        distinctUntilChanged(),
        switchMap((id) => this.load(id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.applyState(state));
  }

  protected toggle(): void {
    this.expanded.update((value) => !value);
  }

  open(): void {
    this.expanded.set(true);
  }

  private load(datasetId: string): Observable<ActivityLoadState> {
    if (!datasetId) {
      return of<ActivityLoadState>({ status: 'success', entries: [] });
    }

    this.loading.set(true);
    this.error.set(false);

    return this.workflow.listAuditLogs(datasetId).pipe(
      map(
        (logs) =>
          ({
            status: 'success',
            entries: sortAuditLogsByNewest(logs.map(mapAuditLog)),
          }) as const,
      ),
      catchError(() => of<ActivityLoadState>({ status: 'error' })),
      tap(() => this.loading.set(false)),
    );
  }

  private applyState(state: ActivityLoadState): void {
    if (state.status === 'loading') {
      return;
    }
    if (state.status === 'error') {
      this.error.set(true);
      this.entries.set([]);
      return;
    }
    this.error.set(false);
    this.entries.set(state.entries);
  }
}
