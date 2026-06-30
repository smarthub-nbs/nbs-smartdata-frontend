import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiError } from '@app/core/models/api-error.model';
import { fieldErrorsFromApi } from '@app/core/utils/api-field-errors.util';
import {
  AdminDatasetRecord,
  AdminDatasetTagLink,
  BackendAdminCategory,
  BackendAdminTag,
  DatasetWorkflowStatus,
} from '@app/features/admin/models/admin-dataset.model';
import { AdminDatasetWorkflowService } from '@app/features/admin/services/admin-dataset-workflow.service';
import {
  workflowStatusChipClasses,
  workflowStatusLabel,
} from '@app/features/admin/utils/admin-workflow-status.util';
import { DatasetMetadataEditorComponent } from '@app/features/admin/components/dataset-metadata-editor.component';
import { DatasetResourceManagerComponent } from '@app/features/admin/components/dataset-resource-manager.component';
import { DatasetActivityLogComponent } from '@app/features/admin/components/dataset-activity-log.component';
import { ButtonComponent, IconComponent } from '@shared/ui';

@Component({
  selector: 'app-dataset-workflow-detail',
  standalone: true,
  imports: [
    RouterLink,
    ButtonComponent,
    IconComponent,
    DatasetMetadataEditorComponent,
    DatasetResourceManagerComponent,
    DatasetActivityLogComponent,
  ],
  templateUrl: './dataset-workflow-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatasetWorkflowDetailComponent {
  readonly record = input.required<AdminDatasetRecord>();
  readonly categories = input.required<BackendAdminCategory[]>();
  readonly tags = input<BackendAdminTag[]>([]);
  readonly canCreateTags = input(false);
  readonly categoriesLoading = input(false);
  readonly categoriesError = input<string | null>(null);
  readonly canReview = input(false);
  readonly canPublish = input(false);
  readonly actionLoading = input('');
  readonly publishedId = input('');

  readonly dirtyChange = output<boolean>();
  readonly submitForReview = output<string>();
  readonly approve = output<string>();
  readonly reject = output<string>();
  readonly publish = output<string>();
  readonly uploadFile = output<File>();
  readonly metadataSaved = output<void>();
  readonly categoryChange = output<string>();
  readonly tagsChanged = output<void>();
  readonly resourcesChanged = output<void>();
  readonly deleteDataset = output<string>();

  private readonly workflow = inject(AdminDatasetWorkflowService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly metadataEditor = viewChild(DatasetMetadataEditorComponent);
  private readonly activityLog = viewChild(DatasetActivityLogComponent);
  private readonly resourceManager = viewChild(DatasetResourceManagerComponent);
  private readonly fileInput =
    viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private readonly overviewAnchor =
    viewChild<ElementRef<HTMLElement>>('overviewAnchor');
  private readonly tagSection =
    viewChild<ElementRef<HTMLElement>>('tagSection');
  private readonly metadataAnchor =
    viewChild<ElementRef<HTMLElement>>('metadataAnchor');
  private readonly filesAnchor =
    viewChild<ElementRef<HTMLElement>>('filesAnchor');
  private readonly activityAnchor =
    viewChild<ElementRef<HTMLElement>>('activityAnchor');

  protected readonly metadataDirty = signal(false);
  protected readonly tagName = signal('');
  protected readonly selectedTagId = signal('');
  protected readonly tagLinks = signal<AdminDatasetTagLink[]>([]);
  protected readonly tagLinksLoading = signal(false);
  protected readonly tagLinksError = signal('');
  protected readonly tagLinkError = signal('');
  protected readonly tagLinking = signal(false);
  protected readonly confirmingUnlinkId = signal('');
  protected readonly pendingCategoryId = signal('');
  protected readonly editMode = signal(false);
  protected readonly activeSectionNav = signal('overview');

  protected readonly categoryDirty = computed(
    () =>
      this.pendingCategoryId() !== '' &&
      this.pendingCategoryId() !== this.currentCategoryId(),
  );

  constructor() {
    effect(
      () => {
        const record = this.record();
        this.editMode.set(false);
        this.pendingCategoryId.set(this.currentCategoryId());
        this.tagName.set('');
        this.selectedTagId.set('');
        this.tagLinkError.set('');
        this.confirmingUnlinkId.set('');
        this.activeSectionNav.set('overview');
        this.loadTagLinks(record.id);
      },
      { allowSignalWrites: true },
    );
  }

  protected readonly canModifyFinalized = computed(
    () => this.canReview() || this.canPublish(),
  );

  private readonly isFinalized = computed(() => {
    const status = this.record().status;
    return status === 'approved' || status === 'published';
  });

  protected readonly isFinalizedReadOnly = computed(
    () => this.isFinalized() && !this.editMode(),
  );

  protected readonly contentEditable = computed(() => {
    const status = this.record().status;
    if (status === 'draft' || status === 'rejected') {
      return true;
    }
    if (this.isFinalized()) {
      return this.editMode() && this.canModifyFinalized();
    }
    return this.canReview();
  });

  protected readonly showResourceManager = computed(() => {
    if (!this.canReview()) {
      return false;
    }
    return !this.isFinalizedReadOnly();
  });

  protected readonly showFilesSection = computed(() => {
    const record = this.record();
    return (
      this.showResourceManager() || (this.contentEditable() && !record.hasFile)
    );
  });

  protected readonly sectionNavItems = computed(() => {
    return [
      { key: 'overview', label: 'Overview' },
      { key: 'tags', label: 'Tags' },
      { key: 'metadata', label: 'Metadata' },
    ];
  });

  protected readonly availableTags = computed(() => {
    const linkedIds = this.linkedTagIds();
    return this.tags().filter((tag) => !linkedIds.has(tag.id));
  });

  protected readonly tagOptions = computed(() => this.availableTags());

  private readonly linkedTagIds = computed(
    () => new Set(this.tagLinks().map((link) => link.tagId)),
  );

  protected readonly canLinkTag = computed(() => {
    if (this.tagLinking()) {
      return false;
    }
    if (this.canCreateTags()) {
      return this.tagName().trim().length > 0;
    }
    return this.selectedTagId().length > 0;
  });

  protected startEditing(): void {
    this.editMode.set(true);
  }

  protected stopEditing(): void {
    if (this.metadataDirty()) {
      this.discardMetadata();
    }
    this.resetCategorySelection();
    this.tagName.set('');
    this.selectedTagId.set('');
    this.tagLinkError.set('');
    this.editMode.set(false);
  }

  protected readonly canEditFinalized = computed(
    () => this.isFinalizedReadOnly() && this.canModifyFinalized(),
  );

  protected readonly currentCategoryId = computed(() => {
    const categorySlug = this.record().categorySlug;
    if (!categorySlug) {
      return '';
    }
    return (
      this.categories().find((category) => category.slug === categorySlug)
        ?.id ?? ''
    );
  });

  protected showRequirements(record: AdminDatasetRecord): boolean {
    return (
      (record.status === 'draft' || record.status === 'rejected') &&
      !this.canSubmit(record)
    );
  }

  protected requirementItems(record: AdminDatasetRecord): {
    key: string;
    label: string;
    complete: boolean;
    focus: () => void;
  }[] {
    return [
      {
        key: 'metadata',
        label: 'Metadata',
        complete: record.hasMetadata,
        focus: () => this.focusMetadata(),
      },
      {
        key: 'tag',
        label: 'Tag',
        complete: record.hasTag,
        focus: () => this.focusTagSection(),
      },
      {
        key: 'file',
        label: 'Primary file',
        complete: record.hasFile,
        focus: () => this.focusFileUpload(),
      },
    ];
  }

  protected readonly nextActionText = computed(() => {
    const record = this.record();
    switch (record.status) {
      case 'draft':
      case 'rejected': {
        if (this.canSubmit(record)) {
          return 'Ready to submit for review.';
        }
        const missing = this.missingRequirements(record);
        return missing.length > 0
          ? `Complete ${missing.join(', ')} before submitting.`
          : 'Complete all requirements before submitting.';
      }
      case 'in_review':
        return this.canReview()
          ? 'Review this dataset and approve or reject it.'
          : 'Waiting for an admin to review this dataset.';
      case 'approved':
        return this.canPublish()
          ? 'Publish to make this dataset visible in Discovery.'
          : 'Waiting for an admin to publish this dataset.';
      case 'published':
        return 'Published and visible in Discovery.';
      default:
        return '';
    }
  });

  isMetadataDirty(): boolean {
    return this.metadataEditor()?.isDirty() ?? false;
  }

  discardMetadata(): void {
    this.metadataEditor()?.discardChanges();
  }

  protected onMetadataDirtyChange(dirty: boolean): void {
    this.metadataDirty.set(dirty);
    this.dirtyChange.emit(dirty);
  }

  protected focusMetadata(): void {
    this.activeSectionNav.set('metadata');
    this.metadataEditor()?.scrollIntoView();
  }

  protected focusFileUpload(): void {
    this.fileInput()?.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
    this.fileInput()?.nativeElement.click();
  }

  protected focusTagSection(): void {
    this.goToSection('tags');
  }

  protected goToSection(key: string): void {
    this.activeSectionNav.set(key);
    if (key === 'activity') {
      this.activityLog()?.open();
    } else if (key === 'files') {
      this.resourceManager()?.open();
    }
    this.sectionElement(key)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  protected requirementChipClasses(complete: boolean): string {
    const base =
      'inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-nbs-primary/40 motion-reduce:transition-none';
    return complete
      ? `${base} bg-nbs-primary/10 text-nbs-primary`
      : `${base} bg-slate-50 text-slate-600 hover:bg-slate-100`;
  }

  protected sectionTabClasses(key: string): string {
    const base =
      'cursor-pointer whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-nbs-primary/40 motion-reduce:transition-none';
    return this.activeSectionNav() === key
      ? `${base} bg-nbs-primary/10 text-nbs-primary`
      : `${base} text-slate-500 hover:bg-slate-50 hover:text-slate-700`;
  }

  private sectionElement(key: string): HTMLElement | undefined {
    switch (key) {
      case 'overview':
        return this.overviewAnchor()?.nativeElement;
      case 'tags':
        return this.tagSection()?.nativeElement;
      case 'metadata':
        return this.metadataAnchor()?.nativeElement;
      case 'files':
        return this.filesAnchor()?.nativeElement;
      case 'activity':
        return this.activityAnchor()?.nativeElement;
      default:
        return undefined;
    }
  }

  protected onCategoryChange(event: Event): void {
    this.pendingCategoryId.set((event.target as HTMLSelectElement).value);
  }

  protected resetCategorySelection(): void {
    this.pendingCategoryId.set(this.currentCategoryId());
  }

  protected saveCategory(): void {
    const categoryId = this.pendingCategoryId();
    if (categoryId && categoryId !== this.currentCategoryId()) {
      this.categoryChange.emit(categoryId);
    }
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) {
      this.uploadFile.emit(file);
    }
  }

  protected onTagInput(event: Event): void {
    this.tagLinkError.set('');
    this.tagName.set((event.target as HTMLInputElement).value);
  }

  protected onTagSelect(tagId: string): void {
    this.tagLinkError.set('');
    this.selectedTagId.set(tagId);
  }

  protected submitTag(): void {
    this.tagLinkError.set('');
    if (this.canCreateTags()) {
      const value = this.tagName().trim();
      if (!value) {
        return;
      }
      const existingLink = this.findLinkedTagByName(value);
      if (existingLink) {
        this.tagLinkError.set(
          `"${existingLink.tagName}" is already linked to this dataset.`,
        );
        return;
      }
      this.runTagLink({ tagName: value });
      return;
    }

    const tagId = this.selectedTagId();
    if (!tagId) {
      return;
    }
    const existingLink = this.findLinkedTagById(tagId);
    if (existingLink) {
      this.tagLinkError.set(
        `"${existingLink.tagName}" is already linked to this dataset.`,
      );
      return;
    }
    this.runTagLink({ tagId });
  }

  protected requestUnlinkTag(linkId: string): void {
    this.confirmingUnlinkId.set(linkId);
    this.tagLinkError.set('');
  }

  protected cancelUnlinkTag(): void {
    this.confirmingUnlinkId.set('');
  }

  protected isLastTagLink(linkId: string): boolean {
    const links = this.tagLinks();
    return links.length === 1 && links[0]?.linkId === linkId;
  }

  protected confirmUnlinkTag(link: AdminDatasetTagLink): void {
    this.confirmingUnlinkId.set('');
    this.tagLinking.set(true);
    this.tagLinkError.set('');
    this.workflow
      .unlinkTag(link.linkId)
      .pipe(
        finalize(() => this.tagLinking.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.loadTagLinks(this.record().id);
          this.tagsChanged.emit();
        },
        error: (error: unknown) =>
          this.tagLinkError.set(this.resolveTagError(error)),
      });
  }

  protected canSubmit(record: AdminDatasetRecord): boolean {
    return (
      (record.status === 'draft' || record.status === 'rejected') &&
      record.hasMetadata &&
      record.hasFile &&
      record.hasTag
    );
  }

  protected canReviewRecord(record: AdminDatasetRecord): boolean {
    return record.status === 'in_review' && this.canReview();
  }

  protected canPublishRecord(record: AdminDatasetRecord): boolean {
    return record.status === 'approved' && this.canPublish();
  }

  protected missingRequirements(record: AdminDatasetRecord): string[] {
    const missing: string[] = [];
    if (!record.hasMetadata) {
      missing.push('metadata');
    }
    if (!record.hasTag) {
      missing.push('tag');
    }
    if (!record.hasFile) {
      missing.push('primary file');
    }
    return missing;
  }

  protected submitBlockedReason(record: AdminDatasetRecord): string {
    if (record.status !== 'draft' && record.status !== 'rejected') {
      return '';
    }
    if (this.canSubmit(record)) {
      return '';
    }
    const missing = this.missingRequirements(record);
    if (missing.length > 0) {
      return `Missing: ${missing.join(', ')}`;
    }
    return '';
  }

  protected statusLabel(status: DatasetWorkflowStatus): string {
    return workflowStatusLabel(status);
  }

  protected statusChipClasses(status: DatasetWorkflowStatus): string {
    return workflowStatusChipClasses(status);
  }

  reloadTagLinks(): void {
    this.loadTagLinks(this.record().id);
  }

  private runTagLink(options: { tagId?: string; tagName?: string }): void {
    const datasetId = this.record().id;
    const request$ = options.tagId
      ? this.workflow.linkTagById(datasetId, options.tagId)
      : this.workflow.linkTagByName(
          datasetId,
          options.tagName ?? '',
          this.canCreateTags(),
        );

    this.tagLinking.set(true);
    request$
      .pipe(
        finalize(() => this.tagLinking.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.tagName.set('');
          this.selectedTagId.set('');
          this.loadTagLinks(datasetId);
          this.tagsChanged.emit();
        },
        error: (error: unknown) =>
          this.tagLinkError.set(this.resolveTagError(error)),
      });
  }

  private findLinkedTagById(tagId: string): AdminDatasetTagLink | undefined {
    return this.tagLinks().find((link) => link.tagId === tagId);
  }

  private findLinkedTagByName(name: string): AdminDatasetTagLink | undefined {
    const normalizedName = this.normalizeTagName(name);
    const normalizedSlug = this.toTagSlug(name);
    return this.tagLinks().find(
      (link) =>
        this.normalizeTagName(link.tagName) === normalizedName ||
        link.tagSlug === normalizedSlug,
    );
  }

  private normalizeTagName(name: string): string {
    return name.trim().toLowerCase();
  }

  private toTagSlug(name: string): string {
    return this.normalizeTagName(name)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private loadTagLinks(datasetId: string): void {
    this.tagLinksLoading.set(true);
    this.tagLinksError.set('');
    this.workflow
      .listTagLinks(datasetId)
      .pipe(
        finalize(() => this.tagLinksLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (tagLinks) => this.tagLinks.set(tagLinks),
        error: () =>
          this.tagLinksError.set(
            'Could not load linked tags for this dataset.',
          ),
      });
  }

  private resolveTagError(error: unknown): string {
    const fieldErrors = fieldErrorsFromApi(error);
    return (
      fieldErrors['tag_id'] ??
      fieldErrors['tag_name'] ??
      fieldErrors['name'] ??
      this.resolveErrorMessage(error)
    );
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Failed to update tags.';
  }
}
