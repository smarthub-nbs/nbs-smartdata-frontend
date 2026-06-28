import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { adminGuard } from '@app/core/guards/admin.guard';
import { AuthService } from '@app/core/services/auth.service';

describe('adminGuard', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/admin' } as RouterStateSnapshot;

  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'hasRole']);

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });

    router = TestBed.inject(Router);
  });

  it('redirects unauthenticated users to login', () => {
    auth.isAuthenticated.and.returnValue(false);
    spyOnProperty(router, 'url', 'get').and.returnValue('/admin');

    const result = TestBed.runInInjectionContext(() =>
      adminGuard(route, state),
    );

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe(
      '/login?returnUrl=%2Fadmin',
    );
  });

  it('allows admins and publishers', () => {
    auth.isAuthenticated.and.returnValue(true);
    auth.hasRole.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      adminGuard(route, state),
    );

    expect(result).toBeTrue();
    expect(auth.hasRole).toHaveBeenCalledWith('admin', 'publisher');
  });

  it('redirects authenticated non-admin users to home', () => {
    auth.isAuthenticated.and.returnValue(true);
    auth.hasRole.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      adminGuard(route, state),
    );

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/');
  });
});
