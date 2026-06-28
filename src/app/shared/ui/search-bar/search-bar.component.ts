import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
} from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

export type SearchBarVariant = 'hero' | 'default' | 'compact';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [ButtonComponent, IconComponent],
  template: `
    <form [class]="formClasses()" (submit)="onSubmit($event)">
      @if (variant() === 'hero' || variant() === 'default') {
        <div [class]="fieldShellClasses()">
          <label class="relative min-w-0 flex-1">
            <span class="sr-only">{{ label() }}</span>
            <app-icon
              name="search"
              [size]="variant() === 'hero' ? 20 : 18"
              class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              [attr.name]="inputName()"
              [placeholder]="placeholder()"
              [class]="inputClasses()"
              [value]="query()"
              (input)="onQueryInput($event)"
            />
          </label>
          @if (showSubmit()) {
            <app-button
              type="submit"
              variant="primary"
              [size]="variant() === 'hero' ? 'lg' : 'md'"
              [loading]="loading()"
            >
              {{ submitLabel() }}
            </app-button>
          }
        </div>
      } @else {
        <label class="relative block">
          <span class="sr-only">{{ label() }}</span>
          <app-icon
            name="search"
            [size]="16"
            class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            [attr.name]="inputName()"
            [placeholder]="placeholder()"
            class="h-9 w-full rounded-md border border-slate-300 bg-white py-0 pl-8 pr-3 text-sm focus:border-nbs-primary focus:outline-none focus:ring-2 focus:ring-nbs-primary/30 lg:w-56"
            [value]="query()"
            (input)="onQueryInput($event)"
          />
        </label>
      }
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBarComponent {
  readonly query = model('');
  readonly variant = input<SearchBarVariant>('default');
  readonly label = input('Search datasets');
  readonly placeholder = input('Search statistics…');
  readonly submitLabel = input('Search');
  readonly inputName = input('search');
  readonly showSubmit = input(true);
  readonly loading = input(false);

  readonly submitted = output<string>();

  protected formClasses(): string {
    return this.variant() === 'compact' ? 'relative' : 'w-full';
  }

  protected fieldShellClasses(): string {
    if (this.variant() === 'hero') {
      return 'flex flex-col gap-3 sm:flex-row sm:items-center';
    }
    return 'flex flex-col gap-2 sm:flex-row sm:items-center';
  }

  protected inputClasses(): string {
    if (this.variant() === 'hero') {
      return 'h-12 w-full rounded-xl bg-white pl-11 pr-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/70';
    }
    return 'h-11 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-nbs-primary focus:outline-none focus:ring-2 focus:ring-nbs-primary/30';
  }

  protected onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    this.submitted.emit(this.query().trim());
  }

  protected onQueryInput(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      this.query.set(input.value);
    }
  }
}
