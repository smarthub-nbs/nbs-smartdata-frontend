import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserRole } from '@app/core/models/user.model';
import { AccountService } from '@app/features/account/services/account.service';
import {
  ButtonComponent,
  DataTableColumn,
  DataTableComponent,
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

interface HubStat {
  icon: StatIcon;
  label: string;
  value: string;
}

interface HubQuickAction {
  label: string;
  route: string;
  roles?: UserRole[];
}

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    TextInputComponent,
    SelectInputComponent,
    DataTableComponent,
  ],
  templateUrl: './account-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPageComponent {
  protected readonly accountService = inject(AccountService);
  private readonly router = inject(Router);

  private readonly quickActionDefs: HubQuickAction[] = [
    { label: 'Search datasets', route: '/search' },
    { label: 'Browse catalog', route: '/datasets' },
    { label: 'Explore dashboards', route: '/explore' },
    {
      label: 'Developer portal',
      route: '/developers',
      roles: ['developer', 'admin'],
    },
    { label: 'Admin console', route: '/admin', roles: ['publisher', 'admin'] },
  ];

  protected readonly account = this.accountService.account;
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

  protected readonly stats = computed<HubStat[]>(() => [
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
    { icon: 'role', label: 'Account role', value: this.roleLabel() },
  ]);

  protected readonly quickActions = computed(() => {
    const role = this.account()?.role;
    if (!role) {
      return [];
    }
    return this.quickActionDefs.filter(
      (action) => !action.roles || action.roles.includes(role),
    );
  });

  protected readonly greeting = computed(() => {
    const name = this.account()?.name?.trim();
    return name ? `Welcome back, ${name.split(' ')[0]}` : 'Welcome back';
  });

  protected readonly datasetColumns: DataTableColumn<SavedDatasetRow>[] = [
    { key: 'title', header: 'Title', sortable: true },
    { key: 'topic', header: 'Topic', sortable: true },
    { key: 'savedAt', header: 'Saved', sortable: true, align: 'right' },
  ];

  protected readonly languageOptions: SelectOption[] = [
    { label: 'English', value: 'en' },
    { label: 'Kiswahili', value: 'sw' },
  ];

  protected readonly themeOptions: SelectOption[] = [
    { label: 'System', value: 'system' },
    { label: 'Light', value: 'light' },
  ];

  protected profileName = this.account()?.name ?? '';
  protected profileEmail = this.account()?.email ?? '';
  protected language = this.account()?.preferences.language ?? 'en';
  protected theme = this.account()?.preferences.theme ?? 'system';
  protected readonly emailNotifications = signal(
    this.account()?.preferences.emailNotifications ?? true,
  );

  protected saveProfile(): void {
    this.accountService.updateProfile(this.profileName, this.profileEmail);
  }

  protected onLanguageChange(value: string): void {
    if (value === 'en' || value === 'sw') {
      this.accountService.updatePreferences({ language: value });
      this.language = value;
    }
  }

  protected onThemeChange(value: string): void {
    if (value === 'light' || value === 'system') {
      this.accountService.updatePreferences({ theme: value });
      this.theme = value;
    }
  }

  protected onEmailNotificationChange(event: Event): void {
    const next = (event.target as HTMLInputElement).checked;
    this.emailNotifications.set(next);
    this.accountService.updatePreferences({ emailNotifications: next });
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
