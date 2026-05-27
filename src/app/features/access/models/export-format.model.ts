export type DatasetExportFormat = 'csv' | 'json' | 'xlsx' | 'pdf' | 'sdmx';

export interface ExportFormatOption {
  id: DatasetExportFormat;
  label: string;
  description: string;
}

export const EXPORT_FORMAT_OPTIONS: ExportFormatOption[] = [
  {
    id: 'csv',
    label: 'CSV',
    description: 'Comma-separated values for spreadsheets',
  },
  {
    id: 'xlsx',
    label: 'Excel',
    description: 'Opens in Microsoft Excel or LibreOffice',
  },
  {
    id: 'json',
    label: 'JSON',
    description: 'Machine-readable metadata and sample records',
  },
  {
    id: 'sdmx',
    label: 'SDMX',
    description: 'Statistical Data and Metadata eXchange (XML)',
  },
  {
    id: 'pdf',
    label: 'PDF report',
    description: 'Printable summary report',
  },
];
