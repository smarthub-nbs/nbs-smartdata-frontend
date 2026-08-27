import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { errorInterceptor } from '@app/core/interceptors/error.interceptor';
import { AuthService } from '@app/core/services/auth.service';
import { of, throwError } from 'rxjs';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', [
      'refreshAccessToken',
      'signOut',
    ]);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('passes through non-401 errors', () => {
    let status = 0;

    http.get('/api/v1/dataset/').subscribe({
      error: (error) => {
        status = error.status;
      },
    });

    const request = httpMock.expectOne('/api/v1/dataset/');
    request.flush('Server error', { status: 500, statusText: 'Server Error' });

    expect(status).toBe(500);
    expect(auth.refreshAccessToken).not.toHaveBeenCalled();
  });

  it('signs out when an auth endpoint returns 401', () => {
    http.get('/api/v1/auth/refresh/').subscribe({
      error: () => undefined,
    });

    const request = httpMock.expectOne('/api/v1/auth/refresh/');
    request.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(auth.signOut).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: router.url },
    });
    expect(auth.refreshAccessToken).not.toHaveBeenCalled();
  });

  it('retries the request after a successful token refresh', () => {
    auth.refreshAccessToken.and.returnValue(of('fresh-token'));

    let body: unknown;

    http.get('/api/v1/dataset/').subscribe((response) => {
      body = response;
    });

    const first = httpMock.expectOne('/api/v1/dataset/');
    first.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    const retry = httpMock.expectOne('/api/v1/dataset/');
    expect(retry.request.headers.get('Authorization')).toBe(
      'Bearer fresh-token',
    );
    retry.flush({ success: true, data: [] });

    expect(body).toEqual({ success: true, data: [] });
    expect(auth.refreshAccessToken).toHaveBeenCalled();
  });

  it('signs out when token refresh fails', () => {
    auth.refreshAccessToken.and.returnValue(of(null));

    http.get('/api/v1/dataset/').subscribe({
      error: () => undefined,
    });

    const first = httpMock.expectOne('/api/v1/dataset/');
    first.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(auth.signOut).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: router.url },
    });
    httpMock.expectNone('/api/v1/dataset/');
  });

  it('does not retry auth login failures through refresh', () => {
    auth.refreshAccessToken.and.returnValue(
      throwError(() => new Error('should not refresh')),
    );

    http.post('/api/v1/auth/login/', {}).subscribe({
      error: () => undefined,
    });

    const request = httpMock.expectOne('/api/v1/auth/login/');
    request.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(auth.signOut).not.toHaveBeenCalled();
    expect(auth.refreshAccessToken).not.toHaveBeenCalled();
  });
});
