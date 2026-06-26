import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatasetAuditEntry } from '@app/features/discovery/models/dataset.model';

@Component({
  selector: 'app-dataset-audit-trail',
  standalone: true,
  imports: [DatePipe],
  template: `
    <section class="nbs-panel">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-nbs-muted">
        Audit trail
      </h2>
      <ul class="mt-4 divide-y divide-slate-100">
        @for (
          entry of entries();
          track entry.createdAt + ':' + entry.action + ':' + entry.actor
        ) {
          <li class="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
            <time
              class="shrink-0 text-sm font-medium text-slate-900"
              [dateTime]="entry.createdAt"
            >
              {{ entry.createdAt | date: 'medium' }}
            </time>
            <span class="text-sm text-nbs-muted">
              {{ entry.action }} — {{ entry.actor }}
            </span>
          </li>
        }
      </ul>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetAuditTrailComponent {
  readonly entries = input.required<DatasetAuditEntry[]>();
}
