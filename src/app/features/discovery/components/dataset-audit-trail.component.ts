import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { DatasetAuditEntry } from '@app/features/discovery/models/dataset.model';

interface AuditTrailRow {
  readonly key: string;
  readonly label: string;
  readonly actor: string;
  readonly createdAt: string;
  readonly details: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  dataset_created: 'Dataset created',
  dataset_updated: 'Dataset updated',
  dataset_published: 'Dataset published',
  dataset_deleted: 'Dataset deleted',
  dataset_submitted: 'Submitted for review',
  dataset_approved: 'Dataset approved',
  dataset_rejected: 'Dataset rejected',
  metadata_updated: 'Metadata updated',
  file_uploaded: 'File uploaded',
  file_previewed: 'File previewed',
  file_data_accessed: 'File accessed',
  file_downloaded: 'File downloaded',
};

@Component({
  selector: 'app-dataset-audit-trail',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './dataset-audit-trail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetAuditTrailComponent {
  readonly entries = input.required<DatasetAuditEntry[]>();

  protected readonly rows = computed<AuditTrailRow[]>(() =>
    this.entries().map((entry, index) => ({
      key: `${entry.createdAt}:${entry.action}:${index}`,
      label: this.humanizeAction(entry.action),
      actor: entry.actor,
      createdAt: entry.createdAt,
      details: this.summarizeDetails(entry.details),
    })),
  );

  private humanizeAction(action: string): string {
    return (
      ACTION_LABELS[action] ??
      action
        .replaceAll(/[_-]+/g, ' ')
        .replaceAll(/\b\w/g, (char) => char.toUpperCase())
    );
  }

  private summarizeDetails(details?: Record<string, unknown>): string | null {
    if (!details) {
      return null;
    }
    const parts = Object.entries(details)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(
        ([key, value]) =>
          `${key.replaceAll('_', ' ')}: ${this.stringifyValue(value)}`,
      );
    return parts.length > 0 ? parts.join(' · ') : null;
  }

  private stringifyValue(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return JSON.stringify(value);
  }
}
