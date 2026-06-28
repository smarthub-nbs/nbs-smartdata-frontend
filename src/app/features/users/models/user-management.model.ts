export type UserOrderingField =
  | 'email'
  | '-email'
  | 'created_at'
  | '-created_at'
  | 'last_login'
  | '-last_login'
  | 'last_login_at'
  | '-last_login_at';

export type TriStateFilter = 'all' | 'yes' | 'no';

export const USER_LIST_PAGE_SIZE = 10;

/** Baseline role the backend always assigns to non-superusers; cannot be removed. */
export const BASELINE_USER_GROUP = 'user';

export const USER_ORDERING_FIELDS: readonly UserOrderingField[] = [
  'email',
  '-email',
  'created_at',
  '-created_at',
  'last_login',
  '-last_login',
  'last_login_at',
  '-last_login_at',
] as const;

export interface UserListPagination {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
  next: string | null;
  previous: string | null;
}

export const EMPTY_USER_PAGINATION: UserListPagination = {
  page: 1,
  pageSize: USER_LIST_PAGE_SIZE,
  totalPages: 1,
  totalItems: 0,
  hasNext: false,
  hasPrevious: false,
  next: null,
  previous: null,
};

export interface ManagedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  isActive: boolean;
  isVerified: boolean;
  isStaff: boolean;
  isSuperuser: boolean;
  groups: string[];
  createdAt: string | null;
  lastLogin: string | null;
  lastLoginAt: string | null;
}

export interface ManagedUserDetail extends ManagedUser {
  permissions: string[];
  updatedAt: string | null;
}

export interface UserGroup {
  id: number;
  name: string;
  permissions: string[];
}

export interface UserListParams {
  q?: string;
  isActive?: boolean;
  isVerified?: boolean;
  group?: string;
  ordering?: UserOrderingField;
  page?: number;
  pageSize?: number;
}

export interface UserListResponse {
  items: ManagedUser[];
  pagination: UserListPagination;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isVerified: boolean;
  groups: string[];
}

export interface UpdateUserPayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  isVerified?: boolean;
}

export interface AssignGroupsPayload {
  groups: string[];
}

export interface BackendUserListItem {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_verified: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  groups: string[];
  created_at: string | null;
  last_login: string | null;
  last_login_at: string | null;
}

export interface BackendUserDetail extends BackendUserListItem {
  permissions: string[];
  updated_at: string | null;
}

export interface BackendUserPagination {
  page: number;
  page_size: number;
  total_pages: number;
  total_items: number;
  has_next: boolean;
  has_previous: boolean;
  next: string | null;
  previous: string | null;
}

export interface BackendUserListResponse {
  items: BackendUserListItem[];
  pagination: BackendUserPagination;
}

export interface BackendUserGroup {
  id: number;
  name: string;
  permissions: string[];
}

export interface BackendCreateUserRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_verified: boolean;
  groups?: string[];
}

export interface BackendUpdateUserRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  is_verified?: boolean;
}

export interface BackendAssignGroupsRequest {
  groups: string[];
}
