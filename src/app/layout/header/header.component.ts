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
  templateUrl: './header.component.html',
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
