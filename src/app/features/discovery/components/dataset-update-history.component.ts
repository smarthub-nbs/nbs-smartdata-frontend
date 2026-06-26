import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatasetUpdateRecord } from '@app/features/discovery/models/dataset.model';

@Component({
  selector: 'app-dataset-update-history',
  standalone: true,
  imports: [DatePipe],
  template: `
    <section class="nbs-panel">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-nbs-muted">
        Update history
      </h2>
      @if (loading()) {
        <p class="mt-3 text-sm text-nbs-muted">Loading history…</p>
      } @else if (entries().length === 0) {
        <p class="mt-3 text-sm text-nbs-muted">
          No workflow history recorded yet.
        </p>
      } @else {
        <ul class="mt-4 divide-y divide-slate-100">
          @for (entry of entries(); track entry.date + ':' + entry.note) {
            <li class="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
              <time
                class="shrink-0 text-sm font-medium text-slate-900"
                [dateTime]="entry.date"
              >
                {{ entry.date | date: 'mediumDate' }}
              </time>
              <span class="text-sm text-nbs-muted">{{ entry.note }}</span>
            </li>
          }
        </ul>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetUpdateHistoryComponent {
  readonly loading = input(false);
  readonly entries = input.required<DatasetUpdateRecord[]>();
}
