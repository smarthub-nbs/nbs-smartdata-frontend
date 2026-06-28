import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonComponent } from '@shared/ui/button/button.component';

describe('ButtonComponent', () => {
  let fixture: ComponentFixture<ButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentRef.setInput('aria-label', 'Save changes');
    fixture.detectChanges();
  });

  it('renders with accessible label and busy state', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Save changes');
    expect(button.getAttribute('aria-busy')).toBe('true');
  });
});
