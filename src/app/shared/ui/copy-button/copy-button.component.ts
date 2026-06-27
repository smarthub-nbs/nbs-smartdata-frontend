import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { copyToClipboard } from '@app/shared/utils/clipboard.util';

export type CopyButtonSize = 'sm' | 'md';
export type CopyButtonTone = 'default' | 'inverse';

const SIZE_CLASSES: Record<CopyButtonSize, string> = {
  sm: 'size-7',
  md: 'size-8',
};

const ICON_CLASSES: Record<CopyButtonSize, string> = {
  sm: 'size-3.5',
  md: 'size-4',
};

@Component({
  selector: 'app-copy-button',
  standalone: true,
  template: `
    <button
      type="button"
      [class]="buttonClasses()"
      [attr.aria-label]="ariaLabel()"
      [attr.title]="ariaLabel()"
      (click)="copy()"
    >
      @if (copied()) {
        <svg
          [class]="iconClasses()"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      } @else {
        <svg
          [class]="iconClasses()"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      }
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyButtonComponent {
  readonly value = input.required<string>();
  readonly label = input('Copy');
  readonly size = input<CopyButtonSize>('sm');
  readonly tone = input<CopyButtonTone>('default');

  protected readonly copied = signal(false);

  private readonly destroyRef = inject(DestroyRef);
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.resetTimer !== null) {
        clearTimeout(this.resetTimer);
      }
    });
  }

  protected ariaLabel(): string {
    return this.copied() ? 'Copied' : this.label();
  }

  protected buttonClasses(): string {
    const size = SIZE_CLASSES[this.size()];
    let state: string;

    if (this.tone() === 'inverse') {
      state = this.copied()
        ? 'text-emerald-300 hover:bg-white/10'
        : 'text-slate-300 hover:bg-white/10 hover:text-white';
    } else {
      state = this.copied()
        ? 'text-nbs-accent hover:bg-nbs-accent/10'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700';
    }

    return `inline-flex shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nbs-primary/30 ${size} ${state}`;
  }

  protected iconClasses(): string {
    return ICON_CLASSES[this.size()];
  }

  protected async copy(): Promise<void> {
    const ok = await copyToClipboard(this.value());
    if (!ok) {
      return;
    }

    this.copied.set(true);
    if (this.resetTimer !== null) {
      clearTimeout(this.resetTimer);
    }
    this.resetTimer = setTimeout(() => {
      this.copied.set(false);
      this.resetTimer = null;
    }, 1500);
  }
}
