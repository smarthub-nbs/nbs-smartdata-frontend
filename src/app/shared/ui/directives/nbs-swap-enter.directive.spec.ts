import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NbsSwapEnterDirective } from '@shared/ui/directives/nbs-swap-enter.directive';

@Component({
  standalone: true,
  imports: [NbsSwapEnterDirective],
  template: `<div [nbsSwapEnter]="key">content</div>`,
})
class HostComponent {
  key = 'a';
}

describe('NbsSwapEnterDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    element = fixture.nativeElement.querySelector('div') as HTMLElement;
    fixture.detectChanges();
  });

  it('applies nbs-enter on init', () => {
    expect(element.classList.contains('nbs-enter')).toBeTrue();
  });

  it('re-applies nbs-enter when swap key changes', () => {
    element.classList.remove('nbs-enter');
    host.key = 'b';
    fixture.detectChanges();

    expect(element.classList.contains('nbs-enter')).toBeTrue();
  });
});
