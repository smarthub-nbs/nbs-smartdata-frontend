import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ApiService } from '@app/core/services/api.service';
import { AuthError, AuthService } from '@app/core/services/auth.service';
import { environment } from '@env/environment';

const apiBase = environment.apiBaseUrl;

const currentUserResponse = {
  id: 'user-1',
  email: 'admin@example.com',
  first_name: 'Admin',
  last_name: 'User',
  is_verified: true,
  is_staff: true,
  is_superuser: false,
  roles: ['admin'],
};

const developerUserResponse = {
  ...currentUserResponse,
  email: 'dev@example.com',
  first_name: 'Dev',
  last_name: 'User',
  is_staff: false,
  roles: ['developer'],
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    localStorage.clear();
    router = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        ApiService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('signs in, stores tokens, and loads the current user', () => {
    let result: unknown;

    service
      .signInWithPassword('admin@example.com', 'secret')
      .subscribe((value) => {
        result = value;
      });

    const login = httpMock.expectOne(`${apiBase}/v1/auth/login/`);
    expect(login.request.body).toEqual({
      email: 'admin@example.com',
      password: 'secret',
    });
    login.flush({
      success: true,
      message: 'ok',
      data: { access: 'access-token', refresh: 'refresh-token' },
    });

    const me = httpMock.expectOne(`${apiBase}/v1/auth/me/`);
    me.flush({
      success: true,
      message: 'ok',
      data: currentUserResponse,
    });

    expect(result).toBeNull();
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.user()?.role).toBe('admin');
    expect(service.getAccessToken()).toBe('access-token');
    expect(localStorage.getItem('nbs_refresh_token')).toBe('refresh-token');
  });

  it('returns an auth error when sign in fails', () => {
    let error!: AuthError | null;

    service
      .signInWithPassword('bad@example.com', 'wrong')
      .subscribe((value) => {
        error = value;
      });

    const login = httpMock.expectOne(`${apiBase}/v1/auth/login/`);
    login.flush(
      {
        success: false,
        error: { code: 'invalid_credentials', message: 'Invalid credentials.' },
      },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(error?.message).toContain('Invalid credentials');
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('registers, stores tokens, and loads the current user', () => {
    let result: unknown;

    service
      .register({
        email: 'new@example.com',
        password: 'secret123',
        first_name: 'New',
        last_name: 'User',
      })
      .subscribe((value) => {
        result = value;
      });

    const register = httpMock.expectOne(`${apiBase}/v1/auth/register/`);
    register.flush({
      success: true,
      message: 'ok',
      data: { access: 'access-token', refresh: 'refresh-token' },
    });

    const me = httpMock.expectOne(`${apiBase}/v1/auth/me/`);
    me.flush({
      success: true,
      message: 'ok',
      data: developerUserResponse,
    });

    expect(result).toBeNull();
    expect(service.user()?.role).toBe('developer');
    expect(service.canManageApiKeys()).toBeTrue();
    expect(service.canReviewDatasets()).toBeFalse();
  });

  it('returns an auth error when registration fails', () => {
    let error!: AuthError | null;

    service
      .register({
        email: 'taken@example.com',
        password: 'secret123',
        first_name: 'Taken',
        last_name: 'User',
      })
      .subscribe((value) => {
        error = value;
      });

    const register = httpMock.expectOne(`${apiBase}/v1/auth/register/`);
    register.flush(
      {
        success: false,
        error: { code: 'validation_error', message: 'Email already exists.' },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(error?.message).toContain('Email already exists');
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('refreshes the access token when a refresh token exists', () => {
    localStorage.setItem('nbs_refresh_token', 'refresh-token');
    let token!: string | null;

    service.refreshAccessToken().subscribe((value) => {
      token = value;
    });

    const refresh = httpMock.expectOne(`${apiBase}/v1/auth/refresh/`);
    expect(refresh.request.body).toEqual({ refresh: 'refresh-token' });
    refresh.flush({
      success: true,
      message: 'ok',
      data: { access: 'new-access-token' },
    });

    expect(token).toBe('new-access-token');
    expect(service.getAccessToken()).toBe('new-access-token');
  });

  it('clears the session when refresh fails', () => {
    localStorage.setItem('nbs_refresh_token', 'refresh-token');
    localStorage.setItem('nbs_access_token', 'old-access');
    localStorage.setItem(
      'nbs_user',
      JSON.stringify({
        id: 'user-1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        initials: 'AU',
        isVerified: true,
      }),
    );

    let token!: string | null;

    service.refreshAccessToken().subscribe((value) => {
      token = value;
    });

    const refresh = httpMock.expectOne(`${apiBase}/v1/auth/refresh/`);
    refresh.flush(
      { success: false, error: { code: 'token_invalid', message: 'Expired.' } },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(token).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem('nbs_access_token')).toBeNull();
  });

  it('signs out, clears storage, and navigates to login', () => {
    localStorage.setItem('nbs_refresh_token', 'refresh-token');
    localStorage.setItem('nbs_access_token', 'access-token');
    localStorage.setItem(
      'nbs_user',
      JSON.stringify({
        id: 'user-1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        initials: 'AU',
        isVerified: true,
      }),
    );

    service.signOut();

    const logout = httpMock.expectOne(`${apiBase}/v1/auth/logout/`);
    logout.flush({ success: true, message: 'ok' });

    expect(localStorage.getItem('nbs_access_token')).toBeNull();
    expect(localStorage.getItem('nbs_refresh_token')).toBeNull();
    expect(localStorage.getItem('nbs_user')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('exposes role-based permission signals', () => {
    let result: unknown;

    service
      .signInWithPassword('admin@example.com', 'secret')
      .subscribe((value) => {
        result = value;
      });

    httpMock.expectOne(`${apiBase}/v1/auth/login/`).flush({
      success: true,
      message: 'ok',
      data: { access: 'access-token', refresh: 'refresh-token' },
    });

    httpMock.expectOne(`${apiBase}/v1/auth/me/`).flush({
      success: true,
      message: 'ok',
      data: currentUserResponse,
    });

    expect(result).toBeNull();
    expect(service.hasRole('admin')).toBeTrue();
    expect(service.canReviewDatasets()).toBeTrue();
    expect(service.canManageOwnDatasets()).toBeTrue();
    expect(service.canManageApiKeys()).toBeTrue();
  });
});
