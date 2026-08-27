import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BadgeComponent } from '@shared/ui/badge/badge.component';

describe('BadgeComponent', () => {
  let fixture: ComponentFixture<BadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BadgeComponent);
    fixture.componentRef.setInput('variant', 'success');
    fixture.componentRef.setInput('dot', true);
    fixture.detectChanges();
  });

  it('renders variant and dot indicator', () => {
    const badge = fixture.nativeElement.querySelector('span');
    expect(badge.className).toContain('border-nbs-success-border');
    expect(
      fixture.nativeElement.querySelector('[aria-hidden="true"]'),
    ).toBeTruthy();
  });
});
