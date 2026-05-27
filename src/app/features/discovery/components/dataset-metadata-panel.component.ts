import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Dataset } from '@app/features/discovery/models/dataset.model';
import { QualityBadgeComponent } from '@app/features/discovery/components/quality-badge.component';

@Component({
  selector: 'app-dataset-metadata-panel',
  standalone: true,
  imports: [DatePipe, DecimalPipe, QualityBadgeComponent],
  template: `
    <section class="rounded-lg border border-nbs-border bg-white p-6 shadow-sm">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-nbs-muted">
        Metadata
      </h2>
      <dl class="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <dt class="text-xs text-nbs-muted">Publisher</dt>
          <dd class="mt-0.5 text-sm font-medium text-slate-900">
            {{ dataset().publisher }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-nbs-muted">License</dt>
          <dd class="mt-0.5 text-sm font-medium text-slate-900">
            {{ dataset().license }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-nbs-muted">Format</dt>
          <dd class="mt-0.5 text-sm font-medium text-slate-900">
            {{ dataset().format }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-nbs-muted">Frequency</dt>
          <dd class="mt-0.5 text-sm font-medium text-slate-900">
            {{ dataset().frequency }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-nbs-muted">Region</dt>
          <dd class="mt-0.5 text-sm font-medium text-slate-900">
            {{ dataset().region }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-nbs-muted">Records</dt>
          <dd class="mt-0.5 text-sm font-medium text-slate-900">
            {{ dataset().recordCount | number }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-nbs-muted">Last updated</dt>
          <dd class="mt-0.5 text-sm font-medium text-slate-900">
            {{ dataset().updatedAt | date: 'longDate' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-nbs-muted">Quality</dt>
          <dd class="mt-1 flex items-center gap-2">
            <app-quality-badge [score]="dataset().qualityScore" />
            <span class="text-sm text-slate-600"
              >{{ dataset().qualityScore }}%</span
            >
          </dd>
        </div>
      </dl>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetMetadataPanelComponent {
  readonly dataset = input.required<Dataset>();
}
