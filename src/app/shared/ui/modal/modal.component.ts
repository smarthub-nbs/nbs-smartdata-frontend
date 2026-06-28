import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

@Component({
  selector: 'app-modal',
  standalone: true,
  host: {
    '(document:keydown.escape)': 'requestClose()',
    '(document:keydown.tab)': 'onTab($event)',
    '(document:keydown.shift.tab)': 'onTab($event)',
  },
  template: `
    <div
      class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm motion-safe:animate-overlay-in sm:items-center"
      (click)="onBackdropClick()"
    >
      <div
        #panel
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="ariaLabel() || title() || 'Dialog'"
        tabindex="-1"
        [class]="panelClasses()"
        (click)="$event.stopPropagation()"
      >
        <div
          class="flex shrink-0 items-start justify-between gap-3 border-b border-nbs-border px-5 py-4"
        >
          <div class="min-w-0">
            @if (title()) {
              <h2 class="text-base font-semibold text-slate-900">
                {{ title() }}
              </h2>
            }
            @if (subtitle()) {
              <p class="mt-0.5 truncate text-sm text-nbs-muted">
                {{ subtitle() }}
              </p>
            }
            <ng-content select="[modalHeader]" />
          </div>
          <button
            type="button"
            class="-mr-1.5 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nbs-primary/40"
            aria-label="Close dialog"
            (click)="requestClose()"
          >
            <svg
              class="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <ng-content />
        </div>

        <div class="shrink-0 empty:hidden">
          <ng-content select="[modalFooter]" />
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  readonly title = input('');
  readonly subtitle = input('');
  readonly ariaLabel = input('', { alias: 'aria-label' });
  readonly size = input<ModalSize>('md');
  readonly closeOnBackdrop = input(true);

  readonly closed = output<void>();

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly opener = this.document.activeElement as HTMLElement | null;

  protected readonly panelClasses = computed(
    () =>
      `relative my-4 flex max-h-[calc(100vh-2rem)] w-full flex-col ${SIZE_CLASSES[this.size()]} rounded-xl border border-nbs-border bg-white shadow-nbs-hover outline-none motion-safe:animate-modal-in`,
  );

  constructor() {
    const body = this.document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    this.destroyRef.onDestroy(() => {
      body.style.overflow = previousOverflow;
      this.opener?.focus?.();
    });

    afterNextRender(() => this.focusInitial());
  }

  protected onBackdropClick(): void {
    if (this.closeOnBackdrop()) {
      this.requestClose();
    }
  }

  protected requestClose(): void {
    this.closed.emit();
  }

  protected onTab(event: Event): void {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }

    const panel = this.panel()?.nativeElement;
    if (!panel) {
      return;
    }

    const focusable = this.getFocusable(panel);
    if (focusable.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1) ?? first;
    const active = this.document.activeElement;
    const outside = !panel.contains(active);

    if (event.shiftKey && (active === first || active === panel || outside)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || outside)) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusInitial(): void {
    const panel = this.panel()?.nativeElement;
    if (!panel) {
      return;
    }
    const focusable = this.getFocusable(panel);
    (focusable[0] ?? panel).focus();
  }

  private getFocusable(panel: HTMLElement): HTMLElement[] {
    const selector =
      'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
    return Array.from(panel.querySelectorAll<HTMLElement>(selector)).filter(
      (element) => element.offsetParent !== null,
    );
  }
}
