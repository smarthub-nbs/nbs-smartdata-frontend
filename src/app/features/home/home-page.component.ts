import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [FormsModule, ButtonComponent],
  templateUrl: './home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected readonly highlights = [
    {
      title: 'Discover',
      description:
        'Find official statistics with smart search and rich metadata.',
    },
    {
      title: 'Explore',
      description: 'Interactive charts and maps without downloading raw files.',
    },
    {
      title: 'Integrate',
      description: 'Connect applications through the unified open API gateway.',
    },
  ];

  protected smartQuery = '';

  protected goTo(path: string): void {
    void this.router.navigate([path]);
  }

  protected goToLogin(): void {
    void this.router.navigate(['/login'], {
      queryParams: { returnUrl: '/' },
    });
  }

  protected submitSmartSearch(): void {
    const q = this.smartQuery.trim();
    void this.router.navigate(['/search'], {
      queryParams: q ? { q } : {},
    });
  }
}
