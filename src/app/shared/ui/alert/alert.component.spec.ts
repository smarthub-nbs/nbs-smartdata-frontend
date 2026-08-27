import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertComponent } from '@shared/ui/alert/alert.component';

describe('AlertComponent', () => {
  let fixture: ComponentFixture<AlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AlertComponent);
    fixture.componentRef.setInput('variant', 'error');
    fixture.detectChanges();
  });

  it('renders with alert role by default', () => {
    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    expect(alert.className).toContain('border-nbs-danger-border');
  });
});
