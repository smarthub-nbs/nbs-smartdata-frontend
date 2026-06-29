import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize, forkJoin, tap } from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import {
  BackendAdminCategory,
  BackendAdminTag,
} from '@app/features/admin/models/admin-dataset.model';
import { AdminDatasetWorkflowService } from '@app/features/admin/services/admin-dataset-workflow.service';

@Injectable()
export class AdminTaxonomyStore {
  private readonly workflow = inject(AdminDatasetWorkflowService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly loaded = signal(false);
  private readonly _categories = signal<BackendAdminCategory[]>([]);
  private readonly _tags = signal<BackendAdminTag[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly categories = this._categories.asReadonly();
  readonly tags = this._tags.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  ensureLoaded(): void {
    if (this.loaded() || this._loading()) {
      return;
    }
    this.refresh();
  }

  refresh(): void {
    this._loading.set(true);
    this._error.set(null);

    forkJoin({
      categories: this.workflow.listCategories(),
      tags: this.workflow.listTags(),
    })
      .pipe(
        finalize(() => this._loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ categories, tags }) => {
          this.loaded.set(true);
          this._categories.set(categories);
          this._tags.set(tags);
        },
        error: (error: unknown) => this._error.set(this.resolveError(error)),
      });
  }

  createCategory(name: string): Observable<BackendAdminCategory> {
    return this.workflow
      .createCategory(name)
      .pipe(
        tap((category) =>
          this._categories.update((items) =>
            this.sortByName([...items, category]),
          ),
        ),
      );
  }

  updateCategory(id: string, name: string): Observable<BackendAdminCategory> {
    return this.workflow
      .updateCategory(id, name)
      .pipe(
        tap((category) =>
          this._categories.update((items) =>
            this.sortByName(
              items.map((item) => (item.id === category.id ? category : item)),
            ),
          ),
        ),
      );
  }

  deleteCategory(id: string): Observable<void> {
    return this.workflow
      .deleteCategory(id)
      .pipe(
        tap(() =>
          this._categories.update((items) =>
            items.filter((item) => item.id !== id),
          ),
        ),
      );
  }

  updateTag(id: string, name: string): Observable<BackendAdminTag> {
    return this.workflow
      .updateTag(id, name)
      .pipe(
        tap((tag) =>
          this._tags.update((items) =>
            this.sortByName(
              items.map((item) => (item.id === tag.id ? tag : item)),
            ),
          ),
        ),
      );
  }

  deleteTag(id: string): Observable<void> {
    return this.workflow
      .deleteTag(id)
      .pipe(
        tap(() =>
          this._tags.update((items) => items.filter((item) => item.id !== id)),
        ),
      );
  }

  private sortByName<T extends { name: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
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
