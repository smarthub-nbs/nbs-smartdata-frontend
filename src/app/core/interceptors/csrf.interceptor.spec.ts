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
import { csrfInterceptor } from '@app/core/interceptors/csrf.interceptor';
import { CsrfService } from '@app/core/services/csrf.service';
import { environment } from '@env/environment';

describe('csrfInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let csrf: CsrfService;
  const apiBase = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([csrfInterceptor])),
        provideHttpClientTesting(),
        CsrfService,
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    csrf = TestBed.inject(CsrfService);
    csrf.clearToken();
    document.cookie = 'csrftoken=; Max-Age=0; path=/';
  });

  afterEach(() => {
    httpMock.verify();
    csrf.clearToken();
    document.cookie = 'csrftoken=; Max-Age=0; path=/';
  });

  it('adds withCredentials to API GET requests', () => {
    http.get(`${apiBase}/v1/dataset/`).subscribe();

    const request = httpMock.expectOne(`${apiBase}/v1/dataset/`);
    expect(request.request.withCredentials).toBeTrue();
    request.flush([]);
  });

  it('bootstraps CSRF and attaches the header for API POST requests', () => {
    http
      .post(`${apiBase}/v1/auth/login/`, {
        email: 'a@b.com',
        password: 'x',
      })
      .subscribe();

    const csrfRequest = httpMock.expectOne(`${apiBase}/v1/auth/csrf/`);
    expect(csrfRequest.request.withCredentials).toBeTrue();
    csrfRequest.flush({
      success: true,
      message: 'ok',
      data: {
        csrf_token: 'csrf-token-123',
        cookie_name: 'csrftoken',
        header_name: 'X-CSRFToken',
      },
    });

    const loginRequest = httpMock.expectOne(`${apiBase}/v1/auth/login/`);
    expect(loginRequest.request.withCredentials).toBeTrue();
    expect(loginRequest.request.headers.get('X-CSRFToken')).toBe(
      'csrf-token-123',
    );
    loginRequest.flush({
      success: true,
      message: 'ok',
      data: { access: 'jwt' },
    });
  });

  it('reuses an existing CSRF cookie for mutating requests', () => {
    document.cookie = 'csrftoken=existing-token; path=/';

    http.post(`${apiBase}/v1/auth/logout/`, { refresh: 'token' }).subscribe();

    httpMock.expectNone(`${apiBase}/v1/auth/csrf/`);

    const logoutRequest = httpMock.expectOne(`${apiBase}/v1/auth/logout/`);
    expect(logoutRequest.request.headers.get('X-CSRFToken')).toBe(
      'existing-token',
    );
    logoutRequest.flush({ success: true, message: 'ok', data: null });
  });
});
