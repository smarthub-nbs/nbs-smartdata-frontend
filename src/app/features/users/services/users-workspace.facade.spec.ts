import { TestBed } from '@angular/core/testing';
import { AuthService } from '@app/core/services/auth.service';
import {
  ManagedUser,
  UserListResponse,
} from '@app/features/users/models/user-management.model';
import { UserManagementService } from '@app/features/users/services/user-management.service';
import { UsersWorkspaceFacade } from '@app/features/users/services/users-workspace.facade';
import { of } from 'rxjs';

const activeUser: ManagedUser = {
  id: 'user-1',
  email: 'member@example.com',
  firstName: 'Member',
  lastName: 'User',
  displayName: 'Member User',
  isActive: true,
  isVerified: true,
  isStaff: false,
  isSuperuser: false,
  groups: ['user'],
  createdAt: '2025-01-01T00:00:00Z',
  lastLogin: null,
  lastLoginAt: null,
};

const listResponse: UserListResponse = {
  items: [activeUser],
  pagination: {
    page: 1,
    pageSize: 10,
    totalPages: 1,
    totalItems: 1,
    hasNext: false,
    hasPrevious: false,
    next: null,
    previous: null,
  },
};

describe('UsersWorkspaceFacade', () => {
  let facade: UsersWorkspaceFacade;
  let usersApi: jasmine.SpyObj<UserManagementService>;

  beforeEach(() => {
    usersApi = jasmine.createSpyObj('UserManagementService', [
      'listUsers',
      'listGroups',
      'getUser',
    ]);
    usersApi.listUsers.and.returnValue(of(listResponse));
    usersApi.listGroups.and.returnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        UsersWorkspaceFacade,
        { provide: UserManagementService, useValue: usersApi },
        {
          provide: AuthService,
          useValue: { user: () => ({ id: 'admin-1' }) },
        },
      ],
    });

    facade = TestBed.inject(UsersWorkspaceFacade);
  });

  it('loads users on init', () => {
    facade.init();

    expect(usersApi.listUsers).toHaveBeenCalled();
    expect(facade.items().length).toBe(1);
    expect(facade.items()[0]?.email).toBe('member@example.com');
  });

  it('clears filters and reloads the list', () => {
    facade.init({ q: 'member' });
    usersApi.listUsers.calls.reset();

    facade.clearFilters();

    expect(facade.searchTerm()).toBe('');
    expect(usersApi.listUsers).toHaveBeenCalled();
  });
});
