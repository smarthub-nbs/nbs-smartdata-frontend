import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'chevron-down'
  | 'check'
  | 'plus'
  | 'x'
  | 'trash'
  | 'upload'
  | 'tag'
  | 'alert-triangle'
  | 'arrow-right'
  | 'file'
  | 'inbox'
  | 'layers'
  | 'sliders'
  | 'search'
  | 'shield'
  | 'bar-chart';

@Component({
  selector: 'app-icon',
  standalone: true,
  host: { class: 'inline-flex shrink-0' },
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (name()) {
        @case ('chevron-down') {
          <path d="m6 9 6 6 6-6" />
        }
        @case ('check') {
          <path d="M20 6 9 17l-5-5" />
        }
        @case ('plus') {
          <path d="M12 5v14M5 12h14" />
        }
        @case ('x') {
          <path d="M18 6 6 18M6 6l12 12" />
        }
        @case ('trash') {
          <path
            d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"
          />
        }
        @case ('upload') {
          <path
            d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
          />
        }
        @case ('tag') {
          <path
            d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"
          />
          <circle cx="7.5" cy="7.5" r="1.5" />
        }
        @case ('alert-triangle') {
          <path
            d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"
          />
        }
        @case ('arrow-right') {
          <path d="M5 12h14M12 5l7 7-7 7" />
        }
        @case ('file') {
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6"
          />
        }
        @case ('inbox') {
          <path
            d="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
          />
        }
        @case ('layers') {
          <path
            d="m12.83 2.18 8.78 4.39a1 1 0 0 1 0 1.78l-8.78 4.39a2 2 0 0 1-1.66 0L2.39 8.35a1 1 0 0 1 0-1.78l8.78-4.39a2 2 0 0 1 1.66 0zM2 12l9.34 4.67a2 2 0 0 0 1.32 0L22 12M2 17l9.34 4.67a2 2 0 0 0 1.32 0L22 17"
          />
        }
        @case ('sliders') {
          <path
            d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"
          />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        }
        @case ('shield') {
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        }
        @case ('bar-chart') {
          <path d="M3 3v18h18M8 17V9M13 17V5M18 17v-6" />
        }
      }
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(16);
  readonly strokeWidth = input(2);
}
