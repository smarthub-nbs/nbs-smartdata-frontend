import {
  DestroyRef,
  Directive,
  ElementRef,
  OnChanges,
  OnInit,
  SimpleChanges,
  inject,
  input,
} from '@angular/core';

export type NbsSwapEnterMode = 'enter' | 'fade';

const ANIMATION_CLASSES = ['nbs-enter', 'nbs-fade'] as const;

/**
 * Re-runs an entrance animation whenever `swapKey` changes. The animation class
 * is removed once it finishes so the host never retains a lingering transform,
 * which would otherwise become a containing block and trap `position: fixed`
 * descendants (e.g. modal overlays) inside the host instead of the viewport.
 */
@Directive({
  selector: '[nbsSwapEnter]',
  standalone: true,
})
export class NbsSwapEnterDirective implements OnInit, OnChanges {
  readonly swapKey = input<string | number | boolean | null | undefined>(
    undefined,
    { alias: 'nbsSwapEnter' },
  );
  readonly mode = input<NbsSwapEnterMode>('enter', {
    alias: 'nbsSwapEnterMode',
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private activeClass: (typeof ANIMATION_CLASSES)[number] | null = null;

  constructor() {
    const el = this.host.nativeElement;
    el.addEventListener('animationend', this.onAnimationEnd);
    this.destroyRef.onDestroy(() =>
      el.removeEventListener('animationend', this.onAnimationEnd),
    );
  }

  ngOnInit(): void {
    this.play();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['swapKey'];
    if (
      change &&
      !change.firstChange &&
      change.currentValue !== change.previousValue
    ) {
      this.play();
    }
  }

  private play(): void {
    const el = this.host.nativeElement;
    this.activeClass = this.mode() === 'fade' ? 'nbs-fade' : 'nbs-enter';

    el.classList.remove(...ANIMATION_CLASSES);
    this.forceReflow(el);
    el.classList.add(this.activeClass);
  }

  private readonly onAnimationEnd = (event: AnimationEvent): void => {
    if (event.target !== this.host.nativeElement || !this.activeClass) {
      return;
    }
    this.host.nativeElement.classList.remove(this.activeClass);
    this.activeClass = null;
  };

  private forceReflow(el: HTMLElement): void {
    el.getBoundingClientRect();
  }
}
