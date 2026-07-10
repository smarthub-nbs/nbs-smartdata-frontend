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
import { authInterceptor } from '@app/core/interceptors/auth.interceptor';
import { AuthService } from '@app/core/services/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', ['getAccessToken']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('passes requests through without Authorization when no token', () => {
    auth.getAccessToken.and.returnValue(null);

    http.get('/api/v1/dataset/').subscribe();

    const request = httpMock.expectOne('/api/v1/dataset/');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush([]);
  });

  it('attaches Bearer token when present', () => {
    auth.getAccessToken.and.returnValue('access-token-123');

    http.get('/api/v1/dataset/').subscribe();

    const request = httpMock.expectOne('/api/v1/dataset/');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer access-token-123',
    );
    request.flush([]);
  });

  it('omits Bearer on cookie-auth endpoints', () => {
    auth.getAccessToken.and.returnValue('expired-access-token');

    http.post('/api/v1/auth/refresh/', {}).subscribe();

    const request = httpMock.expectOne('/api/v1/auth/refresh/');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({ success: true, data: { access: 'new' } });
  });
});
