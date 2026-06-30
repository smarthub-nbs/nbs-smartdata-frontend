import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TriStateFilter } from '@app/features/users/models/user-management.model';
import { UsersWorkspaceFacade } from '@app/features/users/services/users-workspace.facade';
import { formatGroupLabel } from '@app/features/users/utils/user-display.util';
import {
  ButtonComponent,
  IconComponent,
  SelectInputComponent,
  SelectOption,
} from '@shared/ui';

@Component({
  selector: 'app-user-filters',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent, SelectInputComponent],
  templateUrl: './user-filters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFiltersComponent {
  protected readonly facade = inject(UsersWorkspaceFacade);

  protected readonly activeOptions: SelectOption<TriStateFilter>[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'yes' },
    { label: 'Inactive', value: 'no' },
  ];

  protected readonly verifiedOptions: SelectOption<TriStateFilter>[] = [
    { label: 'All', value: 'all' },
    { label: 'Verified', value: 'yes' },
    { label: 'Unverified', value: 'no' },
  ];

  protected groupOptions(): SelectOption[] {
    return [
      { label: 'All groups', value: '' },
      ...this.facade.groups().map((group) => ({
        label: formatGroupLabel(group.name),
        value: group.name,
      })),
    ];
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.facade.search(value);
  }

  protected onGroupChange(value: string): void {
    this.facade.setGroupFilter(value);
  }

  protected onActiveChange(value: TriStateFilter): void {
    this.facade.setActiveFilter(value);
  }

  protected onVerifiedChange(value: TriStateFilter): void {
    this.facade.setVerifiedFilter(value);
  }

  protected clearFilters(): void {
    this.facade.clearFilters();
  }
}
