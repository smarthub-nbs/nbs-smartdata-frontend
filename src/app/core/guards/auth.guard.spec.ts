import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { authGuard } from '@app/core/guards/auth.guard';
import { AuthService } from '@app/core/services/auth.service';

describe('authGuard', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/account' } as RouterStateSnapshot;

  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', ['isAuthenticated']);

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });

    router = TestBed.inject(Router);
  });

  it('allows authenticated users', () => {
    auth.isAuthenticated.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result).toBeTrue();
  });

  it('redirects unauthenticated users to login with returnUrl', () => {
    auth.isAuthenticated.and.returnValue(false);
    spyOnProperty(router, 'url', 'get').and.returnValue('/account');

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe(
      '/login?returnUrl=%2Faccount',
    );
  });
});
