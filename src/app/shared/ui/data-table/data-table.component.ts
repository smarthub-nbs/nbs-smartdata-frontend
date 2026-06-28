import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {
  DataTableColumn,
  DataTableSortState,
} from '@shared/ui/models/data-table-column.model';
import { IconComponent, type IconName } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div
      class="w-full overflow-hidden rounded-xl border border-nbs-border bg-white shadow-nbs-card"
    >
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-nbs-surface">
            <tr>
              @for (column of columns(); track column.key) {
                <th
                  [class]="headerCellClasses(column)"
                  [style.width]="column.width ?? null"
                  [attr.aria-sort]="ariaSort(column.key)"
                  scope="col"
                >
                  @if (column.sortable) {
                    <button
                      type="button"
                      class="inline-flex cursor-pointer items-center gap-1 rounded font-semibold text-slate-700 transition-colors hover:text-nbs-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nbs-primary/40"
                      (click)="toggleSort(column.key)"
                    >
                      {{ column.header }}
                      <app-icon
                        [name]="sortIcon(column.key)"
                        [size]="14"
                        class="text-slate-400"
                      />
                    </button>
                  } @else {
                    <span class="font-semibold text-slate-700">{{
                      column.header
                    }}</span>
                  }
                </th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            @if (loading()) {
              @for (row of skeletonRows(); track row) {
                <tr aria-hidden="true">
                  @for (column of columns(); track column.key) {
                    <td class="px-4 py-3">
                      <span
                        [class]="skeletonBarClass(column.align ?? 'left')"
                      ></span>
                    </td>
                  }
                </tr>
              }
              <tr>
                <td
                  [attr.colspan]="columns().length"
                  class="sr-only"
                  role="status"
                  aria-live="polite"
                >
                  Loading table data
                </td>
              </tr>
            } @else if (paginatedRows().length === 0) {
              <tr>
                <td
                  [attr.colspan]="columns().length"
                  class="px-4 py-12 text-center text-sm text-nbs-muted"
                >
                  {{ emptyMessage() }}
                </td>
              </tr>
            } @else {
              @for (row of paginatedRows(); track trackRow($index, row)) {
                <tr
                  class="transition-colors hover:bg-slate-50"
                  [class.cursor-pointer]="rowClickable()"
                  (click)="onRowClick(row)"
                >
                  @for (column of columns(); track column.key) {
                    <td [class]="bodyCellClasses(column)">
                      {{ formatCell(row, column) }}
                    </td>
                  }
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      @if (showPagination() && totalPages() > 1) {
        <div
          class="flex items-center justify-between border-t border-nbs-border px-4 py-3 text-sm text-slate-600"
        >
          <span>
            {{ rangeLabel() }}
          </span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nbs-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
              [disabled]="currentPage() === 1"
              (click)="goToPage(currentPage() - 1)"
            >
              Previous
            </button>
            <span class="tabular-nums">
              Page {{ currentPage() }} of {{ totalPages() }}
            </span>
            <button
              type="button"
              class="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nbs-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
              [disabled]="currentPage() === totalPages()"
              (click)="goToPage(currentPage() + 1)"
            >
              Next
            </button>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<T extends object> {
  readonly data = input<T[]>([]);
  readonly columns = input<DataTableColumn<T>[]>([]);
  readonly loading = input(false);
  readonly emptyMessage = input('No data available');
  readonly pageSize = input(10);
  readonly showPagination = input(true);
  readonly rowClickable = input(false);
  readonly trackByKey = input<(keyof T & string) | undefined>(undefined);

  readonly sortChange = output<DataTableSortState | null>();
  readonly rowClicked = output<T>();

  protected readonly sortState = signal<DataTableSortState | null>(null);
  protected readonly currentPage = signal(1);

  protected readonly skeletonRows = computed(() =>
    Array.from({ length: Math.min(this.pageSize(), 5) }, (_, index) => index),
  );

  protected readonly sortedRows = computed(() => {
    const rows = [...this.data()];
    const sort = this.sortState();
    if (!sort) {
      return rows;
    }
    const column = this.columns().find((c) => c.key === sort.key);
    if (!column) {
      return rows;
    }
    return rows.sort((a, b) => {
      const aVal = this.formatCell(a, column);
      const bVal = this.formatCell(b, column);
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.sortedRows().length / this.pageSize())),
  );

  protected readonly paginatedRows = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.sortedRows().slice(start, start + this.pageSize());
  });

  protected readonly rangeLabel = computed(() => {
    const total = this.sortedRows().length;
    if (total === 0) {
      return '0 results';
    }
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), total);
    return `${start}–${end} of ${total}`;
  });

  protected headerCellClasses(column: DataTableColumn<T>): string {
    const align = this.alignClass(column.align ?? 'left');
    return `px-4 py-3 text-left text-xs uppercase tracking-wide ${align}`;
  }

  protected bodyCellClasses(column: DataTableColumn<T>): string {
    const align = this.alignClass(column.align ?? 'left');
    return `whitespace-nowrap px-4 py-3 text-sm text-slate-700 ${align}`;
  }

  protected formatCell(row: T, column: DataTableColumn<T>): string {
    if (column.format) {
      return column.format(row);
    }
    const value = (row as Record<string, unknown>)[column.key];
    return this.stringifyTableValue(value);
  }

  protected sortIcon(key: string): IconName {
    const sort = this.sortState();
    if (sort?.key !== key) {
      return 'sort-neutral';
    }
    return sort.direction === 'asc' ? 'sort-asc' : 'sort-desc';
  }

  protected ariaSort(key: string): 'ascending' | 'descending' | 'none' | null {
    const column = this.columns().find((item) => item.key === key);
    if (!column?.sortable) {
      return null;
    }
    const sort = this.sortState();
    if (sort?.key !== key) {
      return 'none';
    }
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }

  protected toggleSort(key: string): void {
    const current = this.sortState();
    let next: DataTableSortState | null;

    if (current?.key !== key) {
      next = { key, direction: 'asc' };
    } else if (current.direction === 'asc') {
      next = { key, direction: 'desc' };
    } else {
      next = null;
    }

    this.sortState.set(next);
    this.currentPage.set(1);
    this.sortChange.emit(next);
  }

  protected goToPage(page: number): void {
    const clamped = Math.min(Math.max(1, page), this.totalPages());
    this.currentPage.set(clamped);
  }

  protected trackRow(index: number, row: T): string | number {
    const key = this.trackByKey();
    if (key && row[key] != null) {
      return this.stringifyTableValue(row[key]);
    }
    return index;
  }

  protected onRowClick(row: T): void {
    if (this.rowClickable()) {
      this.rowClicked.emit(row);
    }
  }

  protected skeletonBarClass(align: 'left' | 'center' | 'right'): string {
    if (align === 'right') {
      return 'ml-auto block h-4 w-1/2 animate-pulse rounded bg-slate-200';
    }
    return 'block h-4 w-3/4 animate-pulse rounded bg-slate-200';
  }

  private stringifyTableValue(value: unknown): string {
    if (value == null) {
      return '';
    }
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return String(value);
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return '';
  }

  private alignClass(align: 'left' | 'center' | 'right'): string {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  }
}
