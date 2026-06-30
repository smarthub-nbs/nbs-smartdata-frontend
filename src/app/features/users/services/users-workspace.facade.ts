import {
  DestroyRef,
  Injectable,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Observable,
  Subject,
  debounceTime,
  distinctUntilChanged,
  finalize,
  switchMap,
} from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import { AuthService } from '@app/core/services/auth.service';
import { ToastService } from '@app/core/services/toast.service';
import {
  AssignGroupsPayload,
  CreateUserPayload,
  EMPTY_USER_PAGINATION,
  ManagedUser,
  ManagedUserDetail,
  TriStateFilter,
  UpdateUserPayload,
  USER_LIST_PAGE_SIZE,
  UserGroup,
  UserListPagination,
  UserOrderingField,
} from '@app/features/users/models/user-management.model';
import { UserManagementService } from '@app/features/users/services/user-management.service';

export interface UsersWorkspaceInitialState {
  q?: string;
  page?: number;
  userId?: string;
  group?: string;
  isActive?: TriStateFilter;
  isVerified?: TriStateFilter;
  ordering?: UserOrderingField;
}

@Injectable()
export class UsersWorkspaceFacade {
  private readonly usersApi = inject(UserManagementService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _items = signal<ManagedUser[]>([]);
  private readonly _pagination = signal<UserListPagination>(
    EMPTY_USER_PAGINATION,
  );
  private readonly _groups = signal<UserGroup[]>([]);
  private readonly _groupsLoading = signal(true);
  private readonly _groupsError = signal<string | null>(null);
  private readonly _selectedUser = signal<ManagedUserDetail | null>(null);
  private readonly _detailLoading = signal(false);
  private readonly _searchTerm = signal('');
  private readonly _groupFilter = signal('');
  private readonly _activeFilter = signal<TriStateFilter>('all');
  private readonly _verifiedFilter = signal<TriStateFilter>('all');
  private readonly _ordering = signal<UserOrderingField>('email');
  private readonly _currentPage = signal(1);
  private readonly _listLoading = signal(true);
  private readonly _listError = signal<string | null>(null);
  private readonly _actionLoading = signal('');
  private readonly _message = signal('');
  private readonly _messageError = signal(false);
  private readonly _showCreateForm = signal(false);
  private readonly _mutations = signal(0);

  readonly items = this._items.asReadonly();
  readonly pagination = this._pagination.asReadonly();
  readonly groups = this._groups.asReadonly();
  readonly groupsLoading = this._groupsLoading.asReadonly();
  readonly groupsError = this._groupsError.asReadonly();
  readonly selectedUser = this._selectedUser.asReadonly();
  readonly detailLoading = this._detailLoading.asReadonly();
  readonly searchTerm = this._searchTerm.asReadonly();
  readonly groupFilter = this._groupFilter.asReadonly();
  readonly activeFilter = this._activeFilter.asReadonly();
  readonly verifiedFilter = this._verifiedFilter.asReadonly();
  readonly ordering = this._ordering.asReadonly();
  readonly currentPage = this._currentPage.asReadonly();
  readonly listLoading = this._listLoading.asReadonly();
  readonly listError = this._listError.asReadonly();
  readonly actionLoading = this._actionLoading.asReadonly();
  readonly message = this._message.asReadonly();
  readonly messageError = this._messageError.asReadonly();
  readonly showCreateForm = this._showCreateForm.asReadonly();
  readonly mutations = this._mutations.asReadonly();
  readonly currentUserId = computed(() => this.auth.user()?.id ?? '');

  readonly selectedId = computed(() => this._selectedUser()?.id ?? '');

  readonly hasActiveFilters = computed(
    () =>
      this._searchTerm().trim().length > 0 ||
      this._groupFilter().length > 0 ||
      this._activeFilter() !== 'all' ||
      this._verifiedFilter() !== 'all',
  );

  readonly pageRangeLabel = computed(() => {
    const total = this._pagination().totalItems;
    if (total === 0) {
      return '0 results';
    }
    const { page, pageSize } = this._pagination();
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `${start}–${end} of ${total}`;
  });

  readonly summaryCounts = computed(() => {
    const items = this._items();
    return {
      total: this._pagination().totalItems,
      active: items.filter((user) => user.isActive).length,
      inactive: items.filter((user) => !user.isActive).length,
      verified: items.filter((user) => user.isVerified).length,
    };
  });

  private requestId = 0;
  private readonly searchInputs = new Subject<string>();

  constructor() {
    this.searchInputs
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this._currentPage.set(1);
        this.loadUsers();
      });
  }

  init(initial?: UsersWorkspaceInitialState): void {
    if (initial?.q) {
      this._searchTerm.set(initial.q);
    }
    if (initial?.page && initial.page > 0) {
      this._currentPage.set(initial.page);
    }
    if (initial?.group) {
      this._groupFilter.set(initial.group);
    }
    if (initial?.isActive) {
      this._activeFilter.set(initial.isActive);
    }
    if (initial?.isVerified) {
      this._verifiedFilter.set(initial.isVerified);
    }
    if (initial?.ordering) {
      this._ordering.set(initial.ordering);
    }

    this.loadGroups();
    this.loadUsers();

    if (initial?.userId) {
      this.selectUser(initial.userId);
    }
  }

  search(term: string): void {
    this._searchTerm.set(term);
    this.searchInputs.next(term);
  }

  setGroupFilter(group: string): void {
    if (group === this._groupFilter()) {
      return;
    }
    this._groupFilter.set(group);
    this._currentPage.set(1);
    this.loadUsers();
  }

  setActiveFilter(filter: TriStateFilter): void {
    if (filter === this._activeFilter()) {
      return;
    }
    this._activeFilter.set(filter);
    this._currentPage.set(1);
    this.loadUsers();
  }

  setVerifiedFilter(filter: TriStateFilter): void {
    if (filter === this._verifiedFilter()) {
      return;
    }
    this._verifiedFilter.set(filter);
    this._currentPage.set(1);
    this.loadUsers();
  }

  clearFilters(): void {
    if (!this.hasActiveFilters()) {
      return;
    }
    this._searchTerm.set('');
    this._groupFilter.set('');
    this._activeFilter.set('all');
    this._verifiedFilter.set('all');
    this._currentPage.set(1);
    this.loadUsers();
  }

  setOrdering(ordering: UserOrderingField): void {
    if (ordering === this._ordering()) {
      return;
    }
    this._ordering.set(ordering);
    this._currentPage.set(1);
    this.loadUsers();
  }

  toggleOrdering(field: 'email' | 'created_at' | 'last_login_at'): void {
    const current = this._ordering();
    const asc = field;
    const desc = `-${field}` as UserOrderingField;
    if (current === asc) {
      this.setOrdering(desc);
      return;
    }
    this.setOrdering(asc);
  }

  sortIndicator(field: 'email' | 'created_at' | 'last_login_at'): string {
    const current = this._ordering();
    if (current === field) {
      return '↑';
    }
    if (current === `-${field}`) {
      return '↓';
    }
    return '↕';
  }

  goToPreviousPage(): void {
    const page = Math.max(1, this._currentPage() - 1);
    if (page === this._currentPage()) {
      return;
    }
    this._currentPage.set(page);
    this.loadUsers();
  }

  goToNextPage(): void {
    const page = Math.min(
      this._pagination().totalPages,
      this._currentPage() + 1,
    );
    if (page === this._currentPage()) {
      return;
    }
    this._currentPage.set(page);
    this.loadUsers();
  }

  openCreateForm(): void {
    this.clearMessage();
    this._selectedUser.set(null);
    this._showCreateForm.set(true);
  }

  closeCreateForm(): void {
    this._showCreateForm.set(false);
  }

  selectUser(id: string): void {
    this.clearMessage();
    this._showCreateForm.set(false);
    const onPage = this._items().find((user) => user.id === id) ?? null;
    if (onPage) {
      this._selectedUser.set({ ...onPage, permissions: [], updatedAt: null });
    }
    this._detailLoading.set(true);
    this.usersApi
      .getUser(id)
      .pipe(
        finalize(() => this._detailLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => this._selectedUser.set(user),
        error: (error: unknown) => this.showError(error),
      });
  }

  clearSelection(): void {
    this._selectedUser.set(null);
  }

  createUser(payload: CreateUserPayload): void {
    this._actionLoading.set('create');
    this.usersApi
      .createUser(payload)
      .pipe(
        finalize(() => this._actionLoading.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => {
          this.showSuccess('User created successfully.');
          this._showCreateForm.set(false);
          this._selectedUser.set(user);
          this.refreshAfterMutation();
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  updateUser(id: string, payload: UpdateUserPayload): void {
    this._actionLoading.set('update');
    this.usersApi
      .updateUser(id, payload)
      .pipe(
        finalize(() => this._actionLoading.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => {
          this.showSuccess('User updated.');
          this._selectedUser.set(user);
          this.refreshAfterMutation();
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  assignGroups(id: string, payload: AssignGroupsPayload): void {
    this._actionLoading.set('groups');
    this.usersApi
      .assignGroups(id, payload)
      .pipe(
        finalize(() => this._actionLoading.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => {
          this.showSuccess('Groups updated.');
          this._selectedUser.set(user);
          this.refreshAfterMutation();
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  /** Persists editable profile fields and group membership in one user action. */
  saveUserChanges(
    id: string,
    profile: UpdateUserPayload | null,
    groups: string[] | null,
  ): void {
    if (!profile && !groups) {
      return;
    }

    let request$: Observable<ManagedUserDetail>;
    if (profile && groups) {
      request$ = this.usersApi
        .updateUser(id, profile)
        .pipe(switchMap(() => this.usersApi.assignGroups(id, { groups })));
    } else if (profile) {
      request$ = this.usersApi.updateUser(id, profile);
    } else {
      request$ = this.usersApi.assignGroups(id, { groups: groups ?? [] });
    }

    this._actionLoading.set('save');
    request$
      .pipe(
        finalize(() => this._actionLoading.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => {
          this.showSuccess('Changes saved.');
          this._selectedUser.set(user);
          this.refreshAfterMutation();
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  deactivateUser(id: string): void {
    this._actionLoading.set('deactivate');
    this.usersApi
      .deactivateUser(id)
      .pipe(
        finalize(() => this._actionLoading.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => {
          this.showSuccess('User deactivated.');
          this._selectedUser.set(user);
          this.refreshAfterMutation();
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  reactivateUser(id: string): void {
    this._actionLoading.set('reactivate');
    this.usersApi
      .reactivateUser(id)
      .pipe(
        finalize(() => this._actionLoading.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => {
          this.showSuccess('User reactivated.');
          this._selectedUser.set(user);
          this.refreshAfterMutation();
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  retryLoadUsers(): void {
    this.loadUsers(this._selectedUser()?.id);
  }

  retryLoadGroups(): void {
    this.loadGroups();
  }

  clearMessage(): void {
    this._message.set('');
    this._messageError.set(false);
  }

  private loadGroups(): void {
    this._groupsLoading.set(true);
    this._groupsError.set(null);
    this.usersApi
      .listGroups()
      .pipe(
        finalize(() => this._groupsLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (groups) => this._groups.set(groups),
        error: (error: unknown) => {
          this._groupsError.set(this.resolveErrorMessage(error));
        },
      });
  }

  private loadUsers(selectId?: string): void {
    const requestId = ++this.requestId;
    this._listLoading.set(true);
    this._listError.set(null);

    this.usersApi
      .listUsers({
        q: this._searchTerm().trim() || undefined,
        isActive: this.toOptionalBool(this._activeFilter()),
        isVerified: this.toOptionalBool(this._verifiedFilter()),
        group: this._groupFilter() || undefined,
        ordering: this._ordering(),
        page: this._currentPage(),
        pageSize: USER_LIST_PAGE_SIZE,
      })
      .pipe(
        finalize(() => {
          if (requestId === this.requestId) {
            this._listLoading.set(false);
          }
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (requestId !== this.requestId) {
            return;
          }
          this._items.set(response.items);
          this._pagination.set(response.pagination);
          const targetId = selectId ?? this._selectedUser()?.id;
          if (targetId) {
            const match = response.items.find((user) => user.id === targetId);
            if (match && !this._detailLoading()) {
              this._selectedUser.update((current) =>
                current?.id === targetId
                  ? { ...current, ...match, permissions: current.permissions }
                  : current,
              );
            }
          }
        },
        error: (error: unknown) => {
          if (requestId !== this.requestId) {
            return;
          }
          this._listError.set(this.resolveErrorMessage(error));
        },
      });
  }

  private refreshAfterMutation(): void {
    this._mutations.update((count) => count + 1);
    this.loadUsers(this._selectedUser()?.id);
  }

  private toOptionalBool(filter: TriStateFilter): boolean | undefined {
    if (filter === 'yes') {
      return true;
    }
    if (filter === 'no') {
      return false;
    }
    return undefined;
  }

  private showSuccess(message: string): void {
    this._message.set(message);
    this._messageError.set(false);
    this.toast.success(message);
  }

  private showError(error: unknown): void {
    const message = this.resolveErrorMessage(error);
    this._message.set(message);
    this._messageError.set(true);
    this.toast.error(message);
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Request failed.';
  }
}
