import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatasetFilters } from '@app/features/discovery/models/dataset.model';
import { DatasetService } from '@app/features/discovery/services/dataset.service';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-dataset-filter-bar',
  standalone: true,
  imports: [FormsModule, ButtonComponent],
  template: `
    <div
      class="rounded-lg border border-nbs-border bg-white p-4 shadow-sm"
      role="search"
    >
      <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
        <label class="lg:col-span-2">
          <span class="mb-1 block text-xs font-medium text-slate-600"
            >Keyword</span
          >
          <input
            type="search"
            class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-nbs-primary focus:outline-none focus:ring-2 focus:ring-nbs-primary/30"
            placeholder="Title, keyword, region…"
            [ngModel]="filters().query"
            (ngModelChange)="onFilterChange('query', $event)"
          />
        </label>

        <label>
          <span class="mb-1 block text-xs font-medium text-slate-600"
            >Topic</span
          >
          <select
            class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-nbs-primary focus:outline-none focus:ring-2 focus:ring-nbs-primary/30"
            [ngModel]="filters().topicSlug"
            (ngModelChange)="onFilterChange('topicSlug', $event)"
          >
            <option value="">All topics</option>
            @for (topic of datasetService.topics(); track topic.slug) {
              <option [value]="topic.slug">{{ topic.name }}</option>
            }
          </select>
        </label>

        <label>
          <span class="mb-1 block text-xs font-medium text-slate-600"
            >Format</span
          >
          <select
            class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-nbs-primary focus:outline-none focus:ring-2 focus:ring-nbs-primary/30"
            [ngModel]="filters().format"
            (ngModelChange)="onFilterChange('format', $event)"
          >
            <option value="">All formats</option>
            @for (format of datasetService.formats(); track format) {
              <option [value]="format">{{ format }}</option>
            }
          </select>
        </label>

        <label>
          <span class="mb-1 block text-xs font-medium text-slate-600"
            >Frequency</span
          >
          <select
            class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-nbs-primary focus:outline-none focus:ring-2 focus:ring-nbs-primary/30"
            [ngModel]="filters().frequency"
            (ngModelChange)="onFilterChange('frequency', $event)"
          >
            <option value="">All frequencies</option>
            @for (frequency of datasetService.frequencies(); track frequency) {
              <option [value]="frequency">{{ frequency }}</option>
            }
          </select>
        </label>

        <label>
          <span class="mb-1 block text-xs font-medium text-slate-600"
            >Region</span
          >
          <select
            class="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-nbs-primary focus:outline-none focus:ring-2 focus:ring-nbs-primary/30"
            [ngModel]="filters().region"
            (ngModelChange)="onFilterChange('region', $event)"
          >
            <option value="">All regions</option>
            @for (region of datasetService.regions(); track region) {
              <option [value]="region">{{ region }}</option>
            }
          </select>
        </label>
      </div>

      <div class="mt-3 flex justify-end">
        <app-button variant="ghost" size="sm" (clicked)="clear.emit()">
          Clear filters
        </app-button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetFilterBarComponent {
  protected readonly datasetService = inject(DatasetService);

  readonly clear = output<void>();

  protected filters = this.datasetService.activeFilters;

  protected onFilterChange(key: keyof DatasetFilters, value: string): void {
    this.datasetService.setFilters({ [key]: value });
  }
}
