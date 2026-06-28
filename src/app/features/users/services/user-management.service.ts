import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import {
  AssignGroupsPayload,
  BackendAssignGroupsRequest,
  BackendCreateUserRequest,
  BackendUpdateUserRequest,
  BackendUserDetail,
  BackendUserGroup,
  BackendUserListItem,
  BackendUserListResponse,
  CreateUserPayload,
  ManagedUser,
  ManagedUserDetail,
  UpdateUserPayload,
  UserGroup,
  UserListParams,
  UserListPagination,
  UserListResponse,
} from '@app/features/users/models/user-management.model';

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly api = inject(ApiService);

  listUsers(params: UserListParams): Observable<UserListResponse> {
    return this.api
      .get<BackendUserListResponse>('/v1/users/', this.toListParams(params))
      .pipe(map((response) => this.toListResponse(response)));
  }

  getUser(id: string): Observable<ManagedUserDetail> {
    return this.api
      .get<BackendUserDetail>(`/v1/users/${id}/`)
      .pipe(map((user) => this.toUserDetail(user)));
  }

  createUser(payload: CreateUserPayload): Observable<ManagedUserDetail> {
    const body: BackendCreateUserRequest = {
      email: payload.email.trim(),
      password: payload.password,
      first_name: payload.firstName.trim(),
      last_name: payload.lastName.trim(),
      is_active: payload.isActive,
      is_verified: payload.isVerified,
      groups: payload.groups,
    };
    return this.api
      .post<BackendUserDetail>('/v1/users/', body)
      .pipe(map((user) => this.toUserDetail(user)));
  }

  updateUser(
    id: string,
    payload: UpdateUserPayload,
  ): Observable<ManagedUserDetail> {
    const body: BackendUpdateUserRequest = {};
    if (payload.email !== undefined) {
      body.email = payload.email.trim();
    }
    if (payload.firstName !== undefined) {
      body.first_name = payload.firstName.trim();
    }
    if (payload.lastName !== undefined) {
      body.last_name = payload.lastName.trim();
    }
    if (payload.isVerified !== undefined) {
      body.is_verified = payload.isVerified;
    }
    return this.api
      .patch<BackendUserDetail>(`/v1/users/${id}/`, body)
      .pipe(map((user) => this.toUserDetail(user)));
  }

  deactivateUser(id: string): Observable<ManagedUserDetail> {
    return this.api
      .post<BackendUserDetail>(`/v1/users/${id}/deactivate/`, {})
      .pipe(map((user) => this.toUserDetail(user)));
  }

  reactivateUser(id: string): Observable<ManagedUserDetail> {
    return this.api
      .post<BackendUserDetail>(`/v1/users/${id}/reactivate/`, {})
      .pipe(map((user) => this.toUserDetail(user)));
  }

  assignGroups(
    id: string,
    payload: AssignGroupsPayload,
  ): Observable<ManagedUserDetail> {
    const body: BackendAssignGroupsRequest = { groups: payload.groups };
    return this.api
      .post<BackendUserDetail>(`/v1/users/${id}/groups/`, body)
      .pipe(map((user) => this.toUserDetail(user)));
  }

  listGroups(): Observable<UserGroup[]> {
    return this.api
      .get<BackendUserGroup[]>('/v1/users/groups/')
      .pipe(map((groups) => groups.map((group) => this.toUserGroup(group))));
  }

  private toListParams(params: UserListParams): Record<string, string> {
    const query: Record<string, string> = {};
    const search = params.q?.trim();
    if (search) {
      query['q'] = search;
    }
    if (params.isActive !== undefined) {
      query['is_active'] = String(params.isActive);
    }
    if (params.isVerified !== undefined) {
      query['is_verified'] = String(params.isVerified);
    }
    if (params.group) {
      query['group'] = params.group;
    }
    if (params.ordering) {
      query['ordering'] = params.ordering;
    }
    if (params.page && params.page > 0) {
      query['page'] = String(params.page);
    }
    if (params.pageSize && params.pageSize > 0) {
      query['page_size'] = String(params.pageSize);
    }
    return query;
  }

  private toListResponse(response: BackendUserListResponse): UserListResponse {
    return {
      items: response.items.map((item) => this.toUser(item)),
      pagination: this.toPagination(response.pagination),
    };
  }

  private toPagination(
    pagination: BackendUserListResponse['pagination'],
  ): UserListPagination {
    return {
      page: pagination.page,
      pageSize: pagination.page_size,
      totalPages: pagination.total_pages,
      totalItems: pagination.total_items,
      hasNext: pagination.has_next,
      hasPrevious: pagination.has_previous,
      next: pagination.next,
      previous: pagination.previous,
    };
  }

  private toUser(item: BackendUserListItem): ManagedUser {
    const firstName = item.first_name ?? '';
    const lastName = item.last_name ?? '';
    const displayName =
      [firstName, lastName].filter(Boolean).join(' ') || item.email;

    return {
      id: item.id,
      email: item.email,
      firstName,
      lastName,
      displayName,
      isActive: item.is_active,
      isVerified: item.is_verified,
      isStaff: item.is_staff,
      isSuperuser: item.is_superuser,
      groups: [...item.groups],
      createdAt: item.created_at,
      lastLogin: item.last_login,
      lastLoginAt: item.last_login_at ?? item.last_login,
    };
  }

  private toUserDetail(item: BackendUserDetail): ManagedUserDetail {
    return {
      ...this.toUser(item),
      permissions: [...item.permissions],
      updatedAt: item.updated_at,
    };
  }

  private toUserGroup(group: BackendUserGroup): UserGroup {
    return {
      id: group.id,
      name: group.name,
      permissions: [...group.permissions],
    };
  }
}
