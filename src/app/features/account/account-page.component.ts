import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserRole } from '@app/core/models/user.model';
import { AccountSecurityComponent } from '@app/features/account/components/account-security.component';
import { AccountService } from '@app/features/account/services/account.service';
import {
  ButtonComponent,
  IconComponent,
  SelectInputComponent,
  SelectOption,
  TextInputComponent,
} from '@shared/ui';

interface SavedDatasetRow {
  datasetId: string;
  title: string;
  topic: string;
  savedAt: string;
}

type StatIcon = 'dataset' | 'query' | 'role';
type QuickActionIcon = 'search' | 'dataset' | 'chart' | 'code' | 'shield';

interface HubStat {
  icon: StatIcon;
  label: string;
  value: string;
}

interface HubQuickAction {
  label: string;
  description: string;
  icon: QuickActionIcon;
  route: string;
  roles?: UserRole[];
}

type HubSection = 'saved' | 'settings';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    IconComponent,
    TextInputComponent,
    SelectInputComponent,
    AccountSecurityComponent,
  ],
  templateUrl: './account-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPageComponent implements OnDestroy {
  protected readonly accountService = inject(AccountService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private profileSavedTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly quickActionDefs: HubQuickAction[] = [
    {
      label: 'Search datasets',
      description: 'Find data by keyword or topic',
      icon: 'search',
      route: '/search',
    },
    {
      label: 'Browse catalog',
      description: 'Explore the full data catalog',
      icon: 'dataset',
      route: '/datasets',
    },
    {
      label: 'Explore dashboards',
      description: 'Visual insights and indicators',
      icon: 'chart',
      route: '/explore',
    },
    {
      label: 'Developer portal',
      description: 'API keys and integration docs',
      icon: 'code',
      route: '/developers',
      roles: ['developer', 'admin'],
    },
    {
      label: 'Admin console',
      description: 'Manage datasets and publishing',
      icon: 'shield',
      route: '/admin',
      roles: ['publisher', 'admin'],
    },
  ];

  protected readonly account = this.accountService.account;
  protected readonly hubSection = signal<HubSection>('saved');
  protected readonly savedQueries = computed(
    () => this.account()?.savedQueries ?? [],
  );
  protected readonly savedDatasets = computed<SavedDatasetRow[]>(() =>
    (this.account()?.savedDatasets ?? []).map((item) => ({
      datasetId: item.datasetId,
      title: item.title,
      topic: item.topic,
      savedAt: item.savedAt,
    })),
  );

  protected readonly stats = computed<HubStat[]>(() => {
    const items: HubStat[] = [
      {
        icon: 'dataset',
        label: 'Saved datasets',
        value: String(this.accountService.savedDatasetCount()),
      },
      {
        icon: 'query',
        label: 'Saved queries',
        value: String(this.accountService.savedQueryCount()),
      },
    ];

    if (this.showRoleStat()) {
      items.push({
        icon: 'role',
        label: 'Account role',
        value: this.roleLabel(),
      });
    }

    return items;
  });

  protected readonly hasRoleSpecificQuickActions = computed(() =>
    this.quickActionDefs.some(
      (action) =>
        action.roles &&
        this.account()?.role &&
        action.roles.includes(this.account()!.role),
    ),
  );

  protected readonly showQuickActionsSidebar = computed(
    () => !this.account()?.isVerified || this.hasRoleSpecificQuickActions(),
  );

  protected readonly showRoleInHero = computed(() => this.showRoleStat());

  protected readonly showRoleStat = computed(() => {
    const role = this.account()?.role;
    return role === 'developer' || role === 'publisher' || role === 'admin';
  });

  protected readonly quickActions = computed(() => {
    const role = this.account()?.role;
    if (!role) {
      return [];
    }

    const allowed = this.quickActionDefs.filter(
      (action) => !action.roles || action.roles.includes(role),
    );

    if (role === 'member' || role === 'public') {
      return allowed.filter((action) => action.roles);
    }

    return allowed;
  });

  protected readonly greeting = computed(() => {
    const name = this.account()?.name?.trim();
    return name ? `Welcome back, ${name.split(' ')[0]}` : 'Welcome back';
  });

  protected readonly languageOptions: SelectOption[] = [
    { label: 'English', value: 'en' },
    { label: 'Kiswahili', value: 'sw' },
  ];

  protected profileName = this.account()?.name ?? '';
  protected profileEmail = this.account()?.email ?? '';
  protected language = this.account()?.preferences.language ?? 'en';
  protected readonly profileSaved = signal(false);
  protected readonly profileSaving = signal(false);
  protected readonly profileError = signal('');
  protected readonly profileFieldErrors = signal<Record<string, string>>({});
  protected readonly preferenceMessage = signal('');
  private preferenceSavedTimer: ReturnType<typeof setTimeout> | null = null;

  protected profileDirty(): boolean {
    const account = this.account();
    if (!account) {
      return false;
    }
    return this.profileName.trim() !== account.name.trim();
  }

  protected profileFieldError(key: string): string {
    return this.profileFieldErrors()[key] ?? '';
  }

  protected onProfileFieldChange(): void {
    this.profileSaved.set(false);
    this.profileError.set('');
    this.profileFieldErrors.set({});
  }

  protected saveProfile(): void {
    const errors: Record<string, string> = {};
    const name = this.profileName.trim();

    if (!name) {
      errors['name'] = 'Name is required.';
    }

    this.profileFieldErrors.set(errors);
    this.profileError.set('');
    if (Object.keys(errors).length > 0 || !this.profileDirty()) {
      return;
    }

    this.profileSaving.set(true);
    this.accountService
      .updateProfile(name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((error) => {
        this.profileSaving.set(false);
        if (error) {
          const fieldErrors = error.fieldErrors ?? {};
          this.profileFieldErrors.set(fieldErrors);
          if (Object.keys(fieldErrors).length === 0) {
            this.profileError.set(error.message);
          }
          return;
        }

        this.profileSaved.set(true);
        if (this.profileSavedTimer) {
          clearTimeout(this.profileSavedTimer);
        }
        this.profileSavedTimer = setTimeout(
          () => this.profileSaved.set(false),
          3000,
        );
      });
  }

  ngOnDestroy(): void {
    if (this.profileSavedTimer) {
      clearTimeout(this.profileSavedTimer);
    }
    if (this.preferenceSavedTimer) {
      clearTimeout(this.preferenceSavedTimer);
    }
  }

  protected scrollToSection(id: string): void {
    this.hubSection.set('settings');
    queueMicrotask(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }

  protected setHubSection(section: HubSection): void {
    this.hubSection.set(section);
  }

  protected onLanguageChange(value: string): void {
    if (value === 'en' || value === 'sw') {
      this.accountService.updatePreferences({ language: value });
      this.language = value;
      this.showPreferenceSaved('Language');
    }
  }

  private showPreferenceSaved(label: string): void {
    this.preferenceMessage.set(`${label} saved`);
    if (this.preferenceSavedTimer) {
      clearTimeout(this.preferenceSavedTimer);
    }
    this.preferenceSavedTimer = setTimeout(
      () => this.preferenceMessage.set(''),
      2500,
    );
  }

  protected goTo(path: string): void {
    void this.router.navigate([path]);
  }

  protected openDataset(row: SavedDatasetRow): void {
    void this.router.navigate(['/datasets', row.datasetId]);
  }

  protected runQuery(query: string): void {
    void this.router.navigate(['/search'], {
      queryParams: { q: query },
    });
  }

  protected removeQuery(id: string): void {
    this.accountService.removeSavedQuery(id);
  }

  protected roleLabel(): string {
    const role = this.account()?.role;
    if (!role) {
      return 'Guest';
    }
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'publisher':
        return 'Publisher';
      case 'developer':
        return 'Developer';
      case 'member':
        return 'Member';
      default:
        return 'Public';
    }
  }
}
