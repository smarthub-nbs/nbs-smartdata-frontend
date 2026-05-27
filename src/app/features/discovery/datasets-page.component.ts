import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatasetCardComponent } from '@app/features/discovery/components/dataset-card.component';
import { DatasetFilterBarComponent } from '@app/features/discovery/components/dataset-filter-bar.component';
import { Dataset } from '@app/features/discovery/models/dataset.model';
import { DatasetService } from '@app/features/discovery/services/dataset.service';
import { PageStateComponent } from '@app/shared/components/page-state/page-state.component';
import {
  ButtonComponent,
  DataTableColumn,
  DataTableComponent,
} from '@shared/ui';

type CatalogView = 'cards' | 'table';

@Component({
  selector: 'app-datasets-page',
  standalone: true,
  imports: [
    RouterLink,
    ButtonComponent,
    DatasetFilterBarComponent,
    DatasetCardComponent,
    DataTableComponent,
    PageStateComponent,
  ],
  template: `
    <div class="space-y-6">
      <header
        class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">Datasets</h1>
          <p class="mt-1 text-sm text-nbs-muted">
            Browse official national statistics with structured metadata.
          </p>
        </div>
        <p class="text-sm text-slate-600">
          {{ datasetService.filteredDatasets().length }} result(s)
        </p>
      </header>

      <section>
        <h2 class="mb-3 text-sm font-semibold text-slate-800">Topics</h2>
        <div class="flex flex-wrap gap-2">
          @for (topic of datasetService.topics(); track topic.slug) {
            <a
              [routerLink]="['/topics', topic.slug]"
              class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-nbs-primary hover:text-nbs-primary"
            >
              {{ topic.name }}
            </a>
          }
        </div>
      </section>

      <app-dataset-filter-bar (clear)="clearFilters()" />

      <div class="flex items-center gap-2">
        <app-button
          [variant]="view() === 'cards' ? 'primary' : 'outline'"
          size="sm"
          (clicked)="view.set('cards')"
        >
          Cards
        </app-button>
        <app-button
          [variant]="view() === 'table' ? 'primary' : 'outline'"
          size="sm"
          (clicked)="view.set('table')"
        >
          Table
        </app-button>
      </div>

      @if (datasetService.filteredDatasets().length === 0) {
        <app-page-state
          title="No datasets match your filters"
          label="Empty results"
          message="Try clearing filters or searching with a broader keyword."
        />
      } @else if (view() === 'cards') {
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          @for (
            dataset of datasetService.filteredDatasets();
            track dataset.id
          ) {
            <app-dataset-card [dataset]="dataset" />
          }
        </div>
      } @else {
        <app-data-table
          [data]="datasetService.filteredDatasets()"
          [columns]="tableColumns"
          [showPagination]="true"
          [pageSize]="8"
          [rowClickable]="true"
          trackByKey="id"
          (rowClicked)="openDataset($event)"
        />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetsPageComponent {
  protected readonly datasetService = inject(DatasetService);
  private readonly router = inject(Router);

  protected readonly view = signal<CatalogView>('cards');

  protected readonly tableColumns: DataTableColumn<Dataset>[] = [
    { key: 'title', header: 'Title', sortable: true },
    { key: 'topicName', header: 'Topic', sortable: true },
    { key: 'region', header: 'Region', sortable: true },
    { key: 'format', header: 'Format', sortable: true },
    { key: 'frequency', header: 'Frequency', sortable: true },
    {
      key: 'updatedAt',
      header: 'Updated',
      sortable: true,
      align: 'right',
    },
  ];

  protected clearFilters(): void {
    this.datasetService.resetFilters();
  }

  protected openDataset(dataset: Dataset): void {
    void this.router.navigate(['/datasets', dataset.id]);
  }
}
