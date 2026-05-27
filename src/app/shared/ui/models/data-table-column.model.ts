export type DataTableAlign = 'left' | 'center' | 'right';

export interface DataTableColumn<T> {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
  align?: DataTableAlign;
  width?: string;
  /** Custom cell formatter; defaults to stringified row[key]. */
  format?: (row: T) => string;
}

export type DataTableSortDirection = 'asc' | 'desc';

export interface DataTableSortState {
  key: string;
  direction: DataTableSortDirection;
}
