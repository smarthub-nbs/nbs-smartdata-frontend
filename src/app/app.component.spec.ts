import { TestBed } from '@angular/core/testing';
import { AuthService } from '@app/core/services/auth.service';
import {
  SESSION_IDLE_TIMEOUT_MS,
  SessionIdleService,
} from '@app/core/services/session-idle.service';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: SESSION_IDLE_TIMEOUT_MS, useValue: 0 },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => false,
            signOut: jasmine.createSpy('signOut'),
          },
        },
        SessionIdleService,
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
