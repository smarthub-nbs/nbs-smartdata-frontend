import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@app/core/services/auth.service';
import { LoginPageComponent } from '@app/features/auth/login-page.component';

describe('LoginPageComponent', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj('AuthService', ['signInWithPassword']);
    auth.signInWithPassword.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: () => null,
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
  });

  it('does not submit when the form is empty', () => {
    fixture.componentInstance['submit']();

    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('submits credentials when the form is valid', () => {
    fixture.componentInstance['form'].setValue({
      username: 'member@example.com',
      password: 'secret',
    });
    fixture.componentInstance['submit']();

    expect(auth.signInWithPassword).toHaveBeenCalledWith(
      'member@example.com',
      'secret',
    );
  });

  it('shows an idle sign-out message when reason=idle', async () => {
    await TestBed.resetTestingModule();
    auth = jasmine.createSpyObj('AuthService', ['signInWithPassword']);
    auth.signInWithPassword.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'reason' ? 'idle' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'You were signed out due to inactivity.',
    );
  });
});
