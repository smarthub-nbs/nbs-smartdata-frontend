import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin, finalize } from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import {
  BackendAdminCategory,
  BackendAdminTag,
} from '@app/features/admin/models/admin-dataset.model';
import { AdminDatasetWorkflowService } from '@app/features/admin/services/admin-dataset-workflow.service';
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
export class TaxonomyManagerComponent {
  private readonly workflow = inject(AdminDatasetWorkflowService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly expanded = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly actionId = signal('');
  protected readonly categories = signal<BackendAdminCategory[]>([]);
  protected readonly tags = signal<BackendAdminTag[]>([]);
  protected readonly newCategoryName = signal('');
  protected readonly editing = signal<EditState | null>(null);
  protected readonly confirmingId = signal('');

  private loaded = false;

  protected toggle(): void {
    this.expanded.update((open) => !open);
    if (this.expanded() && !this.loaded) {
      this.load();
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
    this.actionId.set('new-category');
    this.workflow
      .createCategory(name)
      .pipe(
        finalize(() => this.actionId.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.newCategoryName.set('');
          this.load();
        },
        error: (error: unknown) => this.error.set(this.resolveError(error)),
      });
  }

  protected saveEdit(): void {
    const editing = this.editing();
    if (!editing || !editing.name.trim()) {
      return;
    }
    this.actionId.set(editing.id);
    const request$ =
      editing.kind === 'category'
        ? this.workflow.updateCategory(editing.id, editing.name)
        : this.workflow.updateTag(editing.id, editing.name);

    request$
      .pipe(
        finalize(() => this.actionId.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.editing.set(null);
          this.load();
        },
        error: (error: unknown) => this.error.set(this.resolveError(error)),
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
    this.actionId.set(id);
    const request$ =
      kind === 'category'
        ? this.workflow.deleteCategory(id)
        : this.workflow.deleteTag(id);

    request$
      .pipe(
        finalize(() => this.actionId.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.load(),
        error: (error: unknown) => this.error.set(this.resolveError(error)),
      });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      categories: this.workflow.listCategories(),
      tags: this.workflow.listTags(),
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ categories, tags }) => {
          this.loaded = true;
          this.categories.set(categories);
          this.tags.set(tags);
        },
        error: (error: unknown) => this.error.set(this.resolveError(error)),
      });
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
}
