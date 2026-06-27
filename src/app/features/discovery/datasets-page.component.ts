import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';
import { AccountService } from '@app/features/account/services/account.service';
import { DatasetCardComponent } from '@app/features/discovery/components/dataset-card.component';
import { DatasetFilterBarComponent } from '@app/features/discovery/components/dataset-filter-bar.component';
import { Dataset, DatasetService } from '@app/features/discovery';
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
    ButtonComponent,
    DatasetFilterBarComponent,
    DatasetCardComponent,
    DataTableComponent,
    PageStateComponent,
  ],
  templateUrl: './datasets-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetsPageComponent {
  protected readonly datasetService = inject(DatasetService);
  protected readonly accountService = inject(AccountService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly catalogErrorMessage = computed(() => {
    const state = this.datasetService.catalogLoadState();
    return state.status === 'error' ? state.message : null;
  });

  protected readonly view = signal<CatalogView>('cards');

  protected readonly hasActiveFilters = computed(() => {
    const f = this.datasetService.activeFilters();
    return [f.query, f.topicSlug, f.format, f.frequency, f.region].some(
      (value) => !!value,
    );
  });

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

  protected retryCatalog(): void {
    this.datasetService.refreshCatalog();
  }

  protected openDataset(dataset: Dataset): void {
    void this.router.navigate(['/datasets', dataset.id]);
  }

  protected toggleSaveDataset(dataset: Dataset): void {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: '/datasets' },
      });
      return;
    }

    this.accountService.toggleSavedDataset(dataset);
  }
}
