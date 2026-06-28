import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { ApiDocsPanelComponent } from '@app/features/developers/components/api-docs-panel.component';
import { ApiKeyManagerComponent } from '@app/features/developers/components/api-key-manager.component';
import { ApiTryItConsoleComponent } from '@app/features/developers/components/api-try-it-console.component';
import { DeveloperApiService } from '@app/features/developers/services/developer-api.service';
import { CopyButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-developers-page',
  standalone: true,
  imports: [
    ApiDocsPanelComponent,
    ApiKeyManagerComponent,
    ApiTryItConsoleComponent,
    CopyButtonComponent,
  ],
  templateUrl: './developers-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevelopersPageComponent implements AfterViewInit, OnDestroy {
  protected readonly api = inject(DeveloperApiService);

  protected readonly quickStartCurl = computed(
    () =>
      `curl -H "X-API-Key: YOUR_API_KEY" "${this.api.baseUrl}/v1/gateway/datasets/"`,
  );

  protected readonly sections: readonly { id: string; label: string }[] = [
    { id: 'quick-start', label: 'Quick start' },
    { id: 'api-keys', label: 'API keys' },
    { id: 'api-reference', label: 'Endpoints' },
    { id: 'try-it-console', label: 'Try it' },
  ];

  protected readonly activeSection = signal<string>('quick-start');
  private sectionObserver?: IntersectionObserver;

  ngAfterViewInit(): void {
    this.sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          this.activeSection.set(visible.target.id);
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: [0, 0.25, 0.5, 1] },
    );

    for (const section of this.sections) {
      const element = document.getElementById(section.id);
      if (element) {
        this.sectionObserver.observe(element);
      }
    }
  }

  ngOnDestroy(): void {
    this.sectionObserver?.disconnect();
  }

  protected scrollToSection(id: string): void {
    const prefersReducedMotion = globalThis.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    document.getElementById(id)?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }
}
