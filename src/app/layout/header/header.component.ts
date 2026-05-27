import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';
import { HEADER_NAV_ITEMS } from '@app/layout/header-nav.config';
import { MobileNavService } from '@app/layout/mobile-nav.service';
import { HeaderNavItem } from '@app/layout/models/nav-item.model';
import { ProfileMenuComponent } from '@app/layout/profile-menu/profile-menu.component';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    RouterLinkActive,
    ButtonComponent,
    ProfileMenuComponent,
  ],
  template: `
    <header class="shrink-0 border-b border-nbs-border bg-white">
      <div
        class="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 lg:px-6"
      >
        <div class="flex min-w-0 items-center gap-4">
          <a
            routerLink="/"
            class="flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nbs-primary"
          >
            <span
              class="flex size-8 items-center justify-center rounded-md bg-nbs-primary text-sm font-bold text-white"
              aria-hidden="true"
              >N</span
            >
            <span class="hidden sm:block">
              <span
                class="block text-sm font-semibold leading-tight text-slate-900"
                >NBS</span
              >
              <span class="block text-xs leading-tight text-nbs-muted"
                >SmartData Hub</span
              >
            </span>
          </a>

          <nav
            class="hidden items-center gap-1 lg:flex"
            aria-label="Main navigation"
          >
            @for (item of visibleNavItems(); track item.route) {
              <a
                [routerLink]="item.route"
                routerLinkActive="bg-nbs-primary/10 text-nbs-primary"
                [routerLinkActiveOptions]="{ exact: item.route === '/' }"
                class="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                {{ item.label }}
              </a>
            }
          </nav>
        </div>

        <div class="flex items-center gap-2 sm:gap-3">
          <form class="relative hidden md:block" (ngSubmit)="submitSearch()">
            <label>
              <span class="sr-only">Search datasets</span>
              <input
                type="search"
                name="headerSearch"
                placeholder="Ask about statistics…"
                class="h-9 w-48 rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-nbs-primary focus:outline-none focus:ring-2 focus:ring-nbs-primary/30 lg:w-56"
                [(ngModel)]="searchQuery"
              />
            </label>
          </form>

          <span
            class="hidden rounded-full bg-nbs-surface px-2.5 py-1 text-xs font-medium text-slate-600 xl:inline"
          >
            Dev
          </span>

          @if (auth.isAuthenticated()) {
            <app-profile-menu
              [userName]="auth.user()?.name ?? ''"
              [userEmail]="auth.user()?.email ?? ''"
              [userRole]="roleLabel()"
              [userInitials]="auth.user()?.initials ?? '?'"
              (signOut)="auth.signOut()"
            />
          } @else {
            <app-button variant="primary" size="sm" (clicked)="goToLogin()">
              Sign in
            </app-button>
          }

          <div class="lg:hidden">
            <app-button
              variant="ghost"
              size="sm"
              type="button"
              aria-label="Open navigation menu"
              (clicked)="mobileNav.toggle()"
            >
              <svg
                class="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round" />
              </svg>
            </app-button>
          </div>
        </div>
      </div>

      @if (mobileNav.open()) {
        <nav
          class="border-t border-nbs-border bg-white px-4 py-3 lg:hidden"
          aria-label="Mobile navigation"
        >
          <div class="flex flex-col gap-1">
            @for (item of visibleNavItems(); track item.route) {
              <a
                [routerLink]="item.route"
                routerLinkActive="bg-nbs-primary/10 text-nbs-primary"
                [routerLinkActiveOptions]="{ exact: item.route === '/' }"
                class="rounded-md px-3 py-2 text-sm font-medium text-slate-700"
                (click)="mobileNav.close()"
              >
                {{ item.label }}
              </a>
            }
          </div>
        </nav>
      }
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  protected readonly auth = inject(AuthService);
  protected readonly mobileNav = inject(MobileNavService);
  private readonly router = inject(Router);

  protected searchQuery = '';

  protected readonly visibleNavItems = computed(() =>
    HEADER_NAV_ITEMS.filter((item) => this.canSeeNavItem(item)),
  );

  protected roleLabel(): string {
    const role = this.auth.user()?.role;
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'publisher':
        return 'Publisher';
      case 'member':
        return 'Member';
      default:
        return 'Guest';
    }
  }

  private canSeeNavItem(item: HeaderNavItem): boolean {
    if (!item.roles?.length) {
      return true;
    }
    const user = this.auth.user();
    if (!user) {
      return false;
    }
    return item.roles.includes(user.role);
  }

  protected submitSearch(): void {
    const q = this.searchQuery.trim();
    void this.router.navigate(['/search'], {
      queryParams: q ? { q } : {},
    });
    this.mobileNav.close();
  }

  protected goToLogin(): void {
    void this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url },
    });
    this.mobileNav.close();
  }
}
