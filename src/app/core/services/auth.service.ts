import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  DestroyRef,
  Injectable,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import { UserProfile, UserRole } from '@app/core/models/user.model';
import { ApiService } from '@app/core/services/api.service';
import { CsrfService } from '@app/core/services/csrf.service';
import { ToastService } from '@app/core/services/toast.service';
import { fieldErrorsFromApi } from '@app/core/utils/api-field-errors.util';
import { environment } from '@env/environment';

export interface AuthError {
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface SignOutOptions {
  reason?: 'idle';
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
  is_verified: boolean;
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
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly csrf = inject(CsrfService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currentUser = signal<UserProfile | null>(this.readUser());
  private readonly accessToken = signal<string | null>(
    localStorage.getItem(ACCESS_TOKEN_KEY),
  );
  private refreshInFlight: Observable<string | null> | null = null;

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(
    () => this.currentUser() !== null && this.accessToken() !== null,
  );
  readonly isAdmin = computed(
    () =>
      this.currentUser()?.role === 'admin' ||
      this.currentUser()?.role === 'publisher',
  );

  readonly canReviewDatasets = computed(
    () => this.currentUser()?.role === 'admin',
  );
  readonly canPublishDatasets = this.canReviewDatasets;
  readonly canSeeAllDatasets = this.canReviewDatasets;

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
      .post<ApiEnvelope<RegisterResponse>>(
        `${environment.apiBaseUrl}/v1/auth/register/`,
        request,
      )
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

  signOut(options?: SignOutOptions): void {
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refresh) {
      this.http
        .post(`${environment.apiBaseUrl}/v1/auth/logout/`, { refresh })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ error: () => undefined });
    }
    this.clearSession();
    this.toast.dismissAll();
    if (options?.reason === 'idle') {
      void this.router.navigate(['/login'], {
        queryParams: { reason: 'idle' },
      });
      return;
    }
    void this.router.navigate(['/login']);
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
      .post<ApiEnvelope<RefreshResponse>>(
        `${environment.apiBaseUrl}/v1/auth/refresh/`,
        { refresh },
      )
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

  loadCurrentUser(): Observable<UserProfile | null> {
    if (!this.accessToken()) {
      this.clearSession();
      return of(null);
    }
    return this.fetchCurrentUser().pipe(
      catchError((error: unknown) => {
        if (this.isAuthFailure(error)) {
          this.clearSession();
          return of(null);
        }
        return of(this.currentUser());
      }),
    );
  }

  updateProfile(
    update: Partial<Pick<UserProfile, 'name' | 'email'>>,
  ): Observable<AuthError | null> {
    if (!this.currentUser()) {
      return of({ message: 'You are not signed in.' });
    }

    const payload: Record<string, string> = {};
    if (update.name !== undefined) {
      const { firstName, lastName } = this.splitName(update.name);
      payload['first_name'] = firstName;
      payload['last_name'] = lastName;
    }
    if (update.email !== undefined) {
      payload['email'] = update.email.trim();
    }

    return this.api.patch<CurrentUserResponse>('/v1/auth/me/', payload).pipe(
      tap((user) => this.saveUser(this.toUserProfile(user))),
      map(() => null),
      catchError((error: unknown) =>
        of({
          message: this.resolveApiErrorMessage(
            error,
            'Could not update profile.',
          ),
          fieldErrors: fieldErrorsFromApi(error, {
            email: 'email',
            first_name: 'name',
            last_name: 'name',
          }),
        }),
      ),
    );
  }

  private splitName(fullName: string): {
    firstName: string;
    lastName: string;
  } {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = parts.shift() ?? '';
    return { firstName, lastName: parts.join(' ') };
  }

  changePassword(
    currentPassword: string,
    newPassword: string,
  ): Observable<AuthError | null> {
    return this.api
      .post<unknown>('/v1/auth/password/change/', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      .pipe(
        map(() => null),
        catchError((error: unknown) =>
          of({
            message: this.resolveApiErrorMessage(
              error,
              'Could not change password.',
            ),
            fieldErrors: fieldErrorsFromApi(error, {
              current_password: 'currentPassword',
              new_password: 'newPassword',
            }),
          }),
        ),
      );
  }

  requestPasswordReset(email: string): Observable<AuthError | null> {
    return this.api
      .post<unknown>('/v1/auth/password/reset/request/', {
        email: email.trim(),
      })
      .pipe(
        map(() => null),
        catchError((error: unknown) =>
          of({
            message: this.resolveApiErrorMessage(
              error,
              'Could not request password reset.',
            ),
          }),
        ),
      );
  }

  confirmPasswordReset(
    token: string,
    newPassword: string,
  ): Observable<AuthError | null> {
    return this.api
      .post<unknown>('/v1/auth/password/reset/confirm/', {
        token,
        new_password: newPassword,
      })
      .pipe(
        map(() => null),
        catchError((error: unknown) =>
          of({
            message: this.resolveApiErrorMessage(
              error,
              'Could not reset password.',
            ),
          }),
        ),
      );
  }

  requestEmailVerification(): Observable<AuthError | null> {
    return this.api.post<unknown>('/v1/auth/email/verify/request/', {}).pipe(
      map(() => null),
      catchError((error: unknown) =>
        of({
          message: this.resolveApiErrorMessage(
            error,
            'Could not send verification email.',
          ),
        }),
      ),
    );
  }

  confirmEmailVerification(token: string): Observable<AuthError | null> {
    return this.api
      .post<CurrentUserResponse>('/v1/auth/email/verify/confirm/', { token })
      .pipe(
        tap((user) => {
          if (this.isAuthenticated()) {
            this.saveUser(this.toUserProfile(user));
          }
        }),
        map(() => null),
        catchError((error: unknown) =>
          of({
            message: this.resolveApiErrorMessage(
              error,
              'Could not verify email.',
            ),
          }),
        ),
      );
  }

  private fetchCurrentUser(): Observable<UserProfile> {
    return this.http
      .get<ApiEnvelope<CurrentUserResponse>>(
        `${environment.apiBaseUrl}/v1/auth/me/`,
      )
      .pipe(
        map((response) => this.toUserProfile(response.data)),
        tap((user) => this.saveUser(user)),
      );
  }

  private isAuthFailure(error: unknown): boolean {
    return (
      error instanceof HttpErrorResponse &&
      (error.status === 401 || error.status === 403)
    );
  }

  private clearSession(): void {
    this.currentUser.set(null);
    this.accessToken.set(null);
    this.csrf.clearToken();
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
      const parsed = JSON.parse(rawUser) as Partial<UserProfile>;
      return {
        id: parsed.id ?? '',
        name: parsed.name ?? '',
        email: parsed.email ?? '',
        role: parsed.role ?? 'member',
        initials: parsed.initials ?? 'NU',
        isVerified: parsed.isVerified ?? false,
      };
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
      isVerified: user.is_verified,
    };
  }

  private resolveRole(user: CurrentUserResponse): UserRole {
    if (
      user.is_superuser ||
      user.is_staff ||
      user.roles.includes('admin') ||
      user.roles.includes('super_admin')
    ) {
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

  private resolveApiErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return error.message || fallback;
    }
    return this.resolveErrorMessage(error, fallback);
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
