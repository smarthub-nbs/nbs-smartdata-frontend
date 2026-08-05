import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { FooterComponent } from '@app/layout/footer/footer.component';
import { HeaderComponent } from '@app/layout/header/header.component';
import { MobileNavService } from '@app/layout/mobile-nav.service';
import { NbsSwapEnterDirective } from '@shared/ui';

@Component({
  selector: 'app-site-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    NbsSwapEnterDirective,
  ],
  templateUrl: './site-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteLayoutComponent {
  private readonly router = inject(Router);
  private readonly mobileNav = inject(MobileNavService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly routeKey = signal(this.router.url);

  constructor() {
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.mobileNav.close();
        this.routeKey.set(this.routeGroup(event.urlAfterRedirects));
      });
  }

  private routeGroup(url: string): string {
    return url.split(/[?#]/)[0];
  }
}
