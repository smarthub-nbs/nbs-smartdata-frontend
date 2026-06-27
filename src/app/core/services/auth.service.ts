import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { UserProfile, UserRole } from '@app/core/models/user.model';
import { environment } from '@env/environment';

export interface AuthError {
  message: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface LoginResponse {
  access: string;
  refresh: string;
}

interface RefreshResponse {
  access: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

interface RegisterResponse {
  access: string;
  refresh: string;
}

interface CurrentUserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  roles: string[];
}

const ACCESS_TOKEN_KEY = 'nbs_access_token';
const REFRESH_TOKEN_KEY = 'nbs_refresh_token';
const USER_KEY = 'nbs_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly currentUser = signal<UserProfile | null>(this.readUser());
  private readonly accessToken = signal<string | null>(
    localStorage.getItem(ACCESS_TOKEN_KEY),
  );
  private refreshInFlight: Observable<string | null> | null = null;

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(
    () =>
      this.currentUser()?.role === 'admin' ||
      this.currentUser()?.role === 'publisher',
  );

  /** Full review authority: see all datasets, approve/reject, and publish. */
  readonly canReviewDatasets = computed(
    () => this.currentUser()?.role === 'admin',
  );
  readonly canPublishDatasets = this.canReviewDatasets;
  readonly canSeeAllDatasets = this.canReviewDatasets;

  /** Owner-level authority: create drafts and manage own datasets toward review. */
  readonly canManageOwnDatasets = computed(
    () =>
      this.currentUser()?.role === 'admin' ||
      this.currentUser()?.role === 'publisher',
  );

  readonly canManageApiKeys = computed(
    () =>
      this.currentUser()?.role === 'admin' ||
      this.currentUser()?.role === 'developer',
  );

  hasRole(...roles: UserRole[]): boolean {
    const user = this.currentUser();
    return user !== null && roles.includes(user.role);
  }

  signInWithPassword(
    username: string,
    password: string,
  ): Observable<AuthError | null> {
    return this.http
      .post<ApiEnvelope<LoginResponse>>(
        `${environment.apiBaseUrl}/v1/auth/login/`,
        {
          email: username.trim(),
          password,
        },
      )
      .pipe(
        tap((response) => this.saveTokens(response.data)),
        switchMap(() => this.fetchCurrentUser()),
        map(() => null),
        catchError((error: unknown) =>
          of({ message: this.resolveErrorMessage(error, 'Sign in failed.') }),
        ),
      );
  }

  register(request: RegisterRequest): Observable<AuthError | null> {
    return this.http
      .post<
        ApiEnvelope<RegisterResponse>
      >(`${environment.apiBaseUrl}/v1/auth/register/`, request)
      .pipe(
        tap((response) => this.saveTokens(response.data)),
        switchMap(() => this.fetchCurrentUser()),
        map(() => null),
        catchError((error: unknown) =>
          of({
            message: this.resolveErrorMessage(error, 'Registration failed.'),
          }),
        ),
      );
  }

  signOut(): void {
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refresh) {
      this.http
        .post(`${environment.apiBaseUrl}/v1/auth/logout/`, { refresh })
        .subscribe({ error: () => undefined });
    }
    this.clearSession();
  }

  refreshAccessToken(): Observable<string | null> {
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refresh) {
      return of(null);
    }

    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = this.http
      .post<
        ApiEnvelope<RefreshResponse>
      >(`${environment.apiBaseUrl}/v1/auth/refresh/`, { refresh })
      .pipe(
        map((response) => {
          this.accessToken.set(response.data.access);
          localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access);
          return response.data.access;
        }),
        catchError(() => {
          this.clearSession();
          return of(null);
        }),
        tap(() => {
          this.refreshInFlight = null;
        }),
      );

    return this.refreshInFlight;
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  /** Revalidate the cached session on app bootstrap so role/permissions stay fresh. */
  loadCurrentUser(): Observable<UserProfile | null> {
    if (!this.accessToken()) {
      return of(null);
    }
    return this.fetchCurrentUser().pipe(
      catchError(() => of(this.currentUser())),
    );
  }

  updateProfile(update: Partial<Pick<UserProfile, 'name' | 'email'>>): void {
    this.currentUser.update((current) => {
      if (!current) {
        return current;
      }

      const name = update.name?.trim() || current.name;
      const email = update.email?.trim() || current.email;

      return {
        ...current,
        name,
        email,
        initials: this.buildInitials(name),
      };
    });
  }

  private fetchCurrentUser(): Observable<UserProfile> {
    return this.http
      .get<
        ApiEnvelope<CurrentUserResponse>
      >(`${environment.apiBaseUrl}/v1/auth/me/`)
      .pipe(
        map((response) => this.toUserProfile(response.data)),
        tap((user) => this.saveUser(user)),
      );
  }

  private clearSession(): void {
    this.currentUser.set(null);
    this.accessToken.set(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private buildInitials(name: string): string {
    const letters = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

    return letters || 'NU';
  }

  private saveTokens(tokens: LoginResponse): void {
    this.accessToken.set(tokens.access);
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
  }

  private saveUser(user: UserProfile): void {
    this.currentUser.set(user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  private readUser(): UserProfile | null {
    const rawUser = localStorage.getItem(USER_KEY);
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as UserProfile;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }

  private toUserProfile(user: CurrentUserResponse): UserProfile {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
    const resolvedName = name || user.email;

    return {
      id: user.id,
      name: resolvedName,
      email: user.email,
      role: this.resolveRole(user),
      initials: this.buildInitials(resolvedName),
    };
  }

  private resolveRole(user: CurrentUserResponse): UserRole {
    if (user.is_superuser || user.is_staff || user.roles.includes('admin')) {
      return 'admin';
    }
    if (user.roles.includes('publisher') || user.roles.includes('editor')) {
      return 'publisher';
    }
    if (user.roles.includes('developer')) {
      return 'developer';
    }
    return 'member';
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;

      if (
        typeof body === 'object' &&
        body !== null &&
        'error' in body &&
        typeof body.error === 'object' &&
        body.error !== null &&
        'message' in body.error &&
        typeof body.error.message === 'string'
      ) {
        return body.error.message;
      }

      return error.message || fallback;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return fallback;
  }
}
