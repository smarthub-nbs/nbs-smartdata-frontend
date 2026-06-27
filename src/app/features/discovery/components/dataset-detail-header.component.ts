import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Dataset } from '@app/features/discovery/models/dataset.model';
import { ButtonComponent, IconComponent } from '@shared/ui';

@Component({
  selector: 'app-dataset-detail-header',
  standalone: true,
  imports: [RouterLink, ButtonComponent, IconComponent],
  templateUrl: './dataset-detail-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetDetailHeaderComponent {
  readonly dataset = input.required<Dataset>();
  readonly saved = input(false);
  readonly canSave = input(true);
  readonly explore = output<void>();
  readonly saveToggle = output<void>();

  protected readonly showDescription = computed(() => {
    const { title, description } = this.dataset();
    const text = description.trim();
    if (!text || text === 'No description available.') {
      return false;
    }
    return !this.isRedundantWithTitle(text, title);
  });

  protected readonly visibleKeywords = computed(() => {
    const { title, description, keywords } = this.dataset();
    const context = this.normalize(`${title} ${description}`);
    return keywords.filter((keyword) => {
      const normalized = this.normalize(keyword);
      if (!normalized || normalized.length < 2) {
        return false;
      }
      return (
        !context.includes(normalized) &&
        !this.isRedundantWithTitle(keyword, title)
      );
    });
  });

  private isRedundantWithTitle(value: string, title: string): boolean {
    const normalizedValue = this.normalize(value);
    const normalizedTitle = this.normalize(title);
    if (!normalizedValue || !normalizedTitle) {
      return false;
    }
    return (
      normalizedValue === normalizedTitle ||
      normalizedValue.includes(normalizedTitle) ||
      normalizedTitle.includes(normalizedValue)
    );
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
}
