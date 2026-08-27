import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
} from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { UserAvatarComponent } from '@app/features/users/components/user-avatar.component';
import { UserCreateFormComponent } from '@app/features/users/components/user-create-form.component';
import { UserDetailPanelComponent } from '@app/features/users/components/user-detail-panel.component';
import { UserFiltersComponent } from '@app/features/users/components/user-filters.component';
import { UserTableComponent } from '@app/features/users/components/user-table.component';
import {
  ManagedUser,
  TriStateFilter,
  USER_ORDERING_FIELDS,
  UserOrderingField,
} from '@app/features/users/models/user-management.model';
import { UsersWorkspaceFacade } from '@app/features/users/services/users-workspace.facade';
import { ButtonComponent, IconComponent, ModalComponent } from '@shared/ui';
import { PageStateComponent } from '@app/shared/components/page-state/page-state.component';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [
    DecimalPipe,
    ButtonComponent,
    IconComponent,
    ModalComponent,
    PageStateComponent,
    UserAvatarComponent,
    UserFiltersComponent,
    UserTableComponent,
    UserCreateFormComponent,
    UserDetailPanelComponent,
  ],
  templateUrl: './users-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [UsersWorkspaceFacade],
})
export class UsersPageComponent {
  protected readonly facade = inject(UsersWorkspaceFacade);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    this.facade.init({
      q: params.get('q') ?? undefined,
      page: this.toPage(params.get('page')),
      userId: params.get('user') ?? undefined,
      group: params.get('group') ?? undefined,
      isActive: this.toTriState(params.get('active')),
      isVerified: this.toTriState(params.get('verified')),
      ordering: this.toOrdering(params.get('ordering')),
    });

    effect(() => this.syncUrl());
  }

  protected openCreateForm(): void {
    this.facade.openCreateForm();
  }

  protected refreshUsers(): void {
    this.facade.retryLoadUsers();
  }

  protected onRowSelected(user: ManagedUser): void {
    this.facade.selectUser(user.id);
  }

  protected isSelf(user: ManagedUser): boolean {
    return user.id === this.facade.currentUserId();
  }

  private syncUrl(): void {
    const search = this.facade.searchTerm().trim();
    const page = this.facade.currentPage();
    const user = this.facade.selectedId();
    const group = this.facade.groupFilter();
    const active = this.facade.activeFilter();
    const verified = this.facade.verifiedFilter();
    const ordering = this.facade.ordering();

    const queryParams: Params = {
      q: search || null,
      page: page > 1 ? page : null,
      user: user || null,
      group: group || null,
      active: active === 'all' ? null : active,
      verified: verified === 'all' ? null : verified,
      ordering: ordering === 'email' ? null : ordering,
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private toPage(value: string | null): number | undefined {
    const page = Number(value);
    return Number.isInteger(page) && page > 0 ? page : undefined;
  }

  private toTriState(value: string | null): TriStateFilter | undefined {
    if (value === 'yes' || value === 'no' || value === 'all') {
      return value;
    }
    return undefined;
  }

  private toOrdering(value: string | null): UserOrderingField | undefined {
    if (value && USER_ORDERING_FIELDS.includes(value as UserOrderingField)) {
      return value as UserOrderingField;
    }
    return undefined;
  }
}
