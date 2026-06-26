import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
  template: `
    @if (!account()) {
      <section
        class="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center"
      >
        <h1 class="text-xl font-semibold text-slate-900">My hub</h1>
        <p class="mt-2 text-sm text-nbs-muted">
          Sign in to access your saved datasets and queries.
        </p>
      </section>
    } @else {
      <div class="space-y-6">
        <header>
          <h1 class="text-2xl font-semibold text-slate-900">My hub</h1>
          <p class="mt-1 text-sm text-nbs-muted">
            Manage profile, preferences, and your saved content (SRS 5.8).
          </p>
        </header>

        <div class="grid gap-4 sm:grid-cols-3">
          <article
            class="rounded-lg border border-nbs-border bg-white p-4 shadow-sm"
          >
            <p
              class="text-xs font-medium uppercase tracking-wide text-nbs-muted"
            >
              Saved datasets
            </p>
            <p class="mt-2 text-2xl font-semibold text-slate-900">
              {{ accountService.savedDatasetCount() }}
            </p>
          </article>
          <article
            class="rounded-lg border border-nbs-border bg-white p-4 shadow-sm"
          >
            <p
              class="text-xs font-medium uppercase tracking-wide text-nbs-muted"
            >
              Saved queries
            </p>
            <p class="mt-2 text-2xl font-semibold text-slate-900">
              {{ accountService.savedQueryCount() }}
            </p>
          </article>
          <article
            class="rounded-lg border border-nbs-border bg-white p-4 shadow-sm"
          >
            <p
              class="text-xs font-medium uppercase tracking-wide text-nbs-muted"
            >
              Role
            </p>
            <p class="mt-2 text-2xl font-semibold text-slate-900">
              {{ roleLabel() }}
            </p>
          </article>
        </div>

        <section
          class="rounded-lg border border-nbs-border bg-white p-5 shadow-sm"
        >
          <h2 class="text-sm font-semibold text-slate-900">Profile</h2>
          <form
            class="mt-4 grid gap-4 md:grid-cols-2"
            (ngSubmit)="saveProfile()"
          >
            <app-text-input
              label="Full name"
              name="name"
              [required]="true"
              placeholder="Your full name"
              [(ngModel)]="profileName"
            />
            <app-text-input
              label="Email"
              type="email"
              name="email"
              [required]="true"
              placeholder="you@nbs.go.tz"
              [(ngModel)]="profileEmail"
            />
            <div class="md:col-span-2">
              <app-button type="submit" variant="primary" size="sm">
                Save profile
              </app-button>
            </div>
          </form>
        </section>

        <section
          class="rounded-lg border border-nbs-border bg-white p-5 shadow-sm"
        >
          <h2 class="text-sm font-semibold text-slate-900">Preferences</h2>
          <div class="mt-4 grid gap-4 md:grid-cols-2">
            <app-select-input
              label="Language"
              placeholder="Select language"
              [options]="languageOptions"
              [(ngModel)]="language"
              (ngModelChange)="onLanguageChange($event)"
            />
            <app-select-input
              label="Theme"
              placeholder="Select theme"
              [options]="themeOptions"
              [(ngModel)]="theme"
              (ngModelChange)="onThemeChange($event)"
            />
          </div>

          <label class="mt-4 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              class="size-4 rounded border-slate-300"
              [checked]="emailNotifications()"
              (change)="onEmailNotificationChange($event)"
            />
            Email me when saved datasets are updated
          </label>
        </section>

        <section
          class="rounded-lg border border-nbs-border bg-white p-5 shadow-sm"
        >
          <div class="mb-3 flex items-center justify-between gap-2">
            <h2 class="text-sm font-semibold text-slate-900">Saved datasets</h2>
            <span class="text-xs text-nbs-muted"
              >Click a row to open dataset</span
            >
          </div>
          <app-data-table
            [data]="savedDatasets()"
            [columns]="datasetColumns"
            [showPagination]="false"
            [rowClickable]="true"
            trackByKey="datasetId"
            (rowClicked)="openDataset($event)"
          />
        </section>

        <section
          class="rounded-lg border border-nbs-border bg-white p-5 shadow-sm"
        >
          <h2 class="text-sm font-semibold text-slate-900">Saved queries</h2>
          @if (savedQueries().length === 0) {
            <p class="mt-3 text-sm text-nbs-muted">No saved queries yet.</p>
          } @else {
            <ul class="mt-3 space-y-2">
              @for (item of savedQueries(); track item.id) {
                <li
                  class="flex flex-col gap-2 rounded-md border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p class="text-sm font-medium text-slate-900">
                      {{ item.label }}
                    </p>
                    <p class="text-xs text-nbs-muted">{{ item.query }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <app-button
                      variant="outline"
                      size="sm"
                      (clicked)="runQuery(item.query)"
                    >
                      Run
                    </app-button>
                    <app-button
                      variant="ghost"
                      size="sm"
                      (clicked)="removeQuery(item.id)"
                    >
                      Remove
                    </app-button>
                  </div>
                </li>
              }
            </ul>
          }
        </section>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPageComponent {
  protected readonly accountService = inject(AccountService);
  private readonly router = inject(Router);

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
      case 'member':
        return 'Member';
      default:
        return 'Public';
    }
  }
}
