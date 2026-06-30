import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import { ToastService } from '@app/core/services/toast.service';
import { fieldErrorsFromApi } from '@app/core/utils/api-field-errors.util';
import { AdminTaxonomyStore } from '@app/features/admin/services/admin-taxonomy.store';
import { ButtonComponent, IconComponent } from '@shared/ui';

type TaxonomyKind = 'category' | 'tag';

interface EditState {
  kind: TaxonomyKind;
  id: string;
  name: string;
}

@Component({
  selector: 'app-taxonomy-manager',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent],
  templateUrl: './taxonomy-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaxonomyManagerComponent implements OnInit {
  readonly embedded = input(false);

  private readonly taxonomy = inject(AdminTaxonomyStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);

  ngOnInit(): void {
    if (this.embedded()) {
      this.taxonomy.ensureLoaded();
    }
  }

  protected readonly expanded = signal(false);
  protected readonly actionId = signal('');
  protected readonly actionError = signal('');
  protected readonly error = computed(
    () => this.actionError() || this.taxonomy.error() || '',
  );
  protected readonly loading = this.taxonomy.loading;
  protected readonly categories = this.taxonomy.categories;
  protected readonly tags = this.taxonomy.tags;
  protected readonly newCategoryName = signal('');
  protected readonly newTagName = signal('');
  protected readonly editing = signal<EditState | null>(null);
  protected readonly confirmingId = signal('');

  protected toggle(): void {
    this.expanded.update((open) => !open);
    if (this.expanded()) {
      this.taxonomy.ensureLoaded();
    }
  }

  protected isEditing(kind: TaxonomyKind, id: string): boolean {
    const editing = this.editing();
    return editing?.kind === kind && editing.id === id;
  }

  protected startEdit(kind: TaxonomyKind, id: string, name: string): void {
    this.editing.set({ kind, id, name });
  }

  protected cancelEdit(): void {
    this.editing.set(null);
  }

  protected updateEditName(name: string): void {
    const current = this.editing();
    if (current) {
      this.editing.set({ ...current, name });
    }
  }

  protected addCategory(): void {
    const name = this.newCategoryName().trim();
    if (!name) {
      return;
    }
    this.actionError.set('');
    this.actionId.set('new-category');
    this.taxonomy
      .createCategory(name)
      .pipe(
        finalize(() => this.actionId.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.newCategoryName.set('');
          this.toast.success('Category created.');
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  protected addTag(): void {
    const name = this.newTagName().trim();
    if (!name) {
      return;
    }
    const duplicate = this.tags().some(
      (tag) => tag.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      const message = 'A tag with this name already exists.';
      this.actionError.set(message);
      this.toast.warning(message);
      return;
    }
    this.actionError.set('');
    this.actionId.set('new-tag');
    this.taxonomy
      .createTag(name)
      .pipe(
        finalize(() => this.actionId.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.newTagName.set('');
          this.toast.success('Tag created.');
        },
        error: (error: unknown) =>
          this.showErrorMessage(this.resolveFieldError(error, 'name')),
      });
  }

  protected saveEdit(): void {
    const editing = this.editing();
    if (!editing?.name.trim()) {
      return;
    }
    this.actionError.set('');
    this.actionId.set(editing.id);
    const request$ =
      editing.kind === 'category'
        ? this.taxonomy.updateCategory(editing.id, editing.name)
        : this.taxonomy.updateTag(editing.id, editing.name);

    request$
      .pipe(
        finalize(() => this.actionId.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.editing.set(null);
          this.toast.success(
            editing.kind === 'category' ? 'Category renamed.' : 'Tag renamed.',
          );
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  protected requestDelete(id: string): void {
    this.confirmingId.set(id);
  }

  protected cancelDelete(): void {
    this.confirmingId.set('');
  }

  protected confirmDelete(kind: TaxonomyKind, id: string): void {
    this.confirmingId.set('');
    this.actionError.set('');
    this.actionId.set(id);
    const request$ =
      kind === 'category'
        ? this.taxonomy.deleteCategory(id)
        : this.taxonomy.deleteTag(id);

    request$
      .pipe(
        finalize(() => this.actionId.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () =>
          this.toast.success(
            kind === 'category' ? 'Category deleted.' : 'Tag deleted.',
          ),
        error: (error: unknown) => this.showError(error),
      });
  }

  private resolveFieldError(error: unknown, field: string): string {
    const fieldErrors = fieldErrorsFromApi(error);
    return fieldErrors[field] ?? this.resolveError(error);
  }

  private resolveError(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Request failed.';
  }

  private showError(error: unknown): void {
    this.showErrorMessage(this.resolveError(error));
  }

  private showErrorMessage(message: string): void {
    this.actionError.set(message);
    this.toast.error(message);
  }
}
