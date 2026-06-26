import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Dataset } from '@app/features/discovery/models/dataset.model';
import { QualityBadgeComponent } from '@app/features/discovery/components/quality-badge.component';

@Component({
  selector: 'app-dataset-card',
  standalone: true,
  imports: [RouterLink, DatePipe, QualityBadgeComponent],
  template: `
    <article
      class="nbs-panel-compact flex h-full flex-col p-5 transition-shadow hover:shadow-md"
    >
      <div class="flex items-start justify-between gap-2">
        <a
          [routerLink]="['/datasets', dataset().id]"
          class="text-base font-semibold text-slate-900 hover:text-nbs-primary"
        >
          {{ dataset().title }}
        </a>
        <app-quality-badge [score]="dataset().qualityScore" />
      </div>

      <p class="mt-2 line-clamp-3 flex-1 text-sm text-nbs-muted">
        {{ dataset().description }}
      </p>

      <dl class="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
        <div>
          <dt class="text-nbs-muted">Topic</dt>
          <dd class="font-medium">{{ dataset().topicName }}</dd>
        </div>
        <div>
          <dt class="text-nbs-muted">Region</dt>
          <dd class="font-medium">{{ dataset().region }}</dd>
        </div>
        <div>
          <dt class="text-nbs-muted">Format</dt>
          <dd class="font-medium">{{ dataset().format }}</dd>
        </div>
        <div>
          <dt class="text-nbs-muted">Updated</dt>
          <dd class="font-medium">
            {{ dataset().updatedAt | date: 'mediumDate' }}
          </dd>
        </div>
      </dl>

      <a
        [routerLink]="['/datasets', dataset().id]"
        class="mt-4 text-sm font-medium text-nbs-primary hover:underline"
      >
        View metadata →
      </a>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetCardComponent {
  readonly dataset = input.required<Dataset>();
}
