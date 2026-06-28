import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ApiError } from '@app/core/models/api-error.model';
import { AuthService } from '@app/core/services/auth.service';
import { ApiKeyManagerComponent } from '@app/features/developers/components/api-key-manager.component';
import { ApiKeyRecord } from '@app/features/developers/models/developer-api.model';
import { DeveloperApiService } from '@app/features/developers/services/developer-api.service';
import { of, throwError } from 'rxjs';

const activeKey: ApiKeyRecord = {
  id: 'key-1',
  label: 'Production',
  keyPrefix: 'smartdata_abcd',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastUsedAt: null,
  revoked: false,
};

describe('ApiKeyManagerComponent', () => {
  let fixture: ComponentFixture<ApiKeyManagerComponent>;
  let component: ApiKeyManagerComponent;
  let auth: {
    isAuthenticated: jasmine.Spy;
    canManageApiKeys: jasmine.Spy;
  };
  let api: {
    loadKeys: jasmine.Spy;
    createKey: jasmine.Spy;
    revokeKey: jasmine.Spy;
    setLastIssuedKey: jasmine.Spy;
    keysLoading: () => boolean;
    keysLoadError: () => string | null;
    activeKeys: () => ApiKeyRecord[];
  };
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    auth = {
      isAuthenticated: jasmine
        .createSpy('isAuthenticated')
        .and.returnValue(true),
      canManageApiKeys: jasmine
        .createSpy('canManageApiKeys')
        .and.returnValue(true),
    };
    api = {
      loadKeys: jasmine.createSpy('loadKeys').and.returnValue(of([activeKey])),
      createKey: jasmine.createSpy('createKey').and.returnValue(
        of({
          record: activeKey,
          plainKey: 'smartdata_plain_key_value',
        }),
      ),
      revokeKey: jasmine.createSpy('revokeKey').and.returnValue(of(undefined)),
      setLastIssuedKey: jasmine.createSpy('setLastIssuedKey'),
      keysLoading: () => false,
      keysLoadError: () => null,
      activeKeys: () => [activeKey],
    };
    router = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ApiKeyManagerComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: DeveloperApiService, useValue: api },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ApiKeyManagerComponent);
    component = fixture.componentInstance;
  });

  it('loads keys on init when the user can manage API keys', () => {
    fixture.detectChanges();

    expect(api.loadKeys).toHaveBeenCalled();
  });

  it('does not load keys when the user cannot manage API keys', () => {
    auth.canManageApiKeys.and.returnValue(false);

    fixture.detectChanges();

    expect(api.loadKeys).not.toHaveBeenCalled();
  });

  it('creates a key and reveals the plain-text secret', () => {
    fixture.detectChanges();

    component['newKeyLabel'] = 'Staging';
    component['createKey']();
    fixture.detectChanges();

    expect(api.createKey).toHaveBeenCalledWith('Staging');
    expect(component['revealedKey']()).toBe('smartdata_plain_key_value');
    expect(component['keyVisible']()).toBeTrue();
    expect(api.setLastIssuedKey).toHaveBeenCalledWith(
      'smartdata_plain_key_value',
    );
  });

  it('revokes a key through the API', () => {
    fixture.detectChanges();

    component['revoke']('key-1');

    expect(api.revokeKey).toHaveBeenCalledWith('key-1');
    expect(component['revokingId']()).toBe('');
  });

  it('masks and toggles the revealed key', () => {
    component['revealedKey'].set('smartdata_plain_key_value');
    component['keyVisible'].set(false);

    expect(component['maskedKey']('smartdata_plain_key_value')).toContain('•');

    component['toggleKeyVisibility']();
    expect(component['keyVisible']()).toBeTrue();
  });

  it('surfaces create errors', () => {
    api.createKey.and.returnValue(
      throwError(() => new ApiError('Could not create key', 400)),
    );
    fixture.detectChanges();

    component['newKeyLabel'] = 'Broken';
    component['createKey']();

    expect(component['errorMessage']()).toBe('Could not create key');
    expect(component['creating']()).toBeFalse();
  });

  it('navigates to login from the signed-out state', () => {
    auth.isAuthenticated.and.returnValue(false);
    fixture.detectChanges();

    component['goToLogin']();

    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/developers' },
    });
  });
});
