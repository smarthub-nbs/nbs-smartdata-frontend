import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('title', 'No items');
    fixture.detectChanges();
  });

  it('renders title and message', () => {
    fixture.componentRef.setInput('message', 'Try again later.');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('No items');
    expect(text).toContain('Try again later.');
  });
});
