import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { filter, fromEvent } from 'rxjs';

@Component({
  selector: 'app-profile-menu',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './profile-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileMenuComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly menuId = `profile-menu-${Math.random().toString(36).slice(2, 9)}`;

  readonly userName = input('NBS User');
  readonly userEmail = input('user@nbs.co.uk');
  readonly userRole = input('Project member');
  readonly userInitials = input('NU');

  readonly signOut = output<void>();

  protected readonly menuOpen = signal(false);

  constructor() {
    fromEvent<MouseEvent>(document, 'click')
      .pipe(
        filter(() => this.menuOpen()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        if (!this.elementRef.nativeElement.contains(event.target as Node)) {
          this.closeMenu();
        }
      });

    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        filter((event) => event.key === 'Escape' && this.menuOpen()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.closeMenu());
  }

  protected toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected onSignOut(): void {
    this.closeMenu();
    this.signOut.emit();
  }
}
