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

@Component({
  selector: 'app-data-table',
  standalone: true,
  templateUrl: './data-table.component.html',
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
    return value == null ? '' : String(value);
  }

  protected sortIndicator(key: string): string {
    const sort = this.sortState();
    if (!sort || sort.key !== key) {
      return '↕';
    }
    return sort.direction === 'asc' ? '↑' : '↓';
  }

  protected toggleSort(key: string): void {
    const current = this.sortState();
    let next: DataTableSortState | null;

    if (!current || current.key !== key) {
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
      return String(row[key]);
    }
    return index;
  }

  protected onRowClick(row: T): void {
    if (this.rowClickable()) {
      this.rowClicked.emit(row);
    }
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
