import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent } from '@shared/ui/modal/modal.component';

describe('ModalComponent', () => {
  let fixture: ComponentFixture<ModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalComponent);
    fixture.componentRef.setInput('title', 'Confirm action');
    fixture.detectChanges();
  });

  it('renders dialog with accessible name', () => {
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });
});
