import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';
import { ToastService } from '@app/core/services/toast.service';
import {
  AdminDatasetQueueResponse,
  AdminDatasetQueueSummary,
  AdminDatasetRecord,
} from '@app/features/admin/models/admin-dataset.model';
import { AdminDatasetWorkflowService } from '@app/features/admin/services/admin-dataset-workflow.service';
import { AdminWorkspaceFacade } from '@app/features/admin/services/admin-workspace.facade';
import { DatasetService } from '@app/features/discovery/services/dataset.service';
import { of, throwError } from 'rxjs';

const draftRecord: AdminDatasetRecord = {
  id: 'ds-draft',
  slug: 'climate-draft',
  status: 'draft',
  visibility: false,
  categorySlug: 'climate',
  categoryName: 'Climate',
  title: 'Climate Draft',
  hasMetadata: true,
  hasFile: true,
  hasTag: true,
  primaryFileId: 'file-1',
};

const reviewRecord: AdminDatasetRecord = {
  ...draftRecord,
  id: 'ds-review',
  slug: 'climate-review',
  status: 'in_review',
  title: 'Climate Review',
};

const queueResponse: AdminDatasetQueueResponse = {
  items: [draftRecord, reviewRecord],
  pagination: {
    page: 1,
    pageSize: 10,
    totalPages: 1,
    totalItems: 2,
    hasNext: false,
    hasPrevious: false,
    next: null,
    previous: null,
  },
};

const queueSummary: AdminDatasetQueueSummary = {
  total: 2,
  draft: 1,
  in_review: 1,
  approved: 0,
  rejected: 0,
  published: 0,
};

describe('AdminWorkspaceFacade', () => {
  let facade: AdminWorkspaceFacade;
  let workflow: jasmine.SpyObj<AdminDatasetWorkflowService>;
  let datasetService: jasmine.SpyObj<DatasetService>;
  let toast: jasmine.SpyObj<ToastService>;
  let auth: {
    canSeeAllDatasets: jasmine.Spy;
  };

  beforeEach(() => {
    workflow = jasmine.createSpyObj('AdminDatasetWorkflowService', [
      'listAdminQueue',
      'getAdminQueueSummary',
      'listOwnedQueue',
      'getDataset',
      'submitForReview',
      'reviewDataset',
      'publishDataset',
    ]);
    datasetService = jasmine.createSpyObj('DatasetService', [
      'markCatalogStale',
    ]);
    toast = jasmine.createSpyObj('ToastService', ['success', 'error', 'show']);
    auth = {
      canSeeAllDatasets: jasmine
        .createSpy('canSeeAllDatasets')
        .and.returnValue(true),
    };

    workflow.listAdminQueue.and.returnValue(of(queueResponse));
    workflow.getAdminQueueSummary.and.returnValue(of(queueSummary));
    workflow.listOwnedQueue.and.returnValue(of([draftRecord, reviewRecord]));
    workflow.getDataset.and.callFake((id: string) =>
      of(id === reviewRecord.id ? reviewRecord : draftRecord),
    );
    workflow.submitForReview.and.returnValue(of(undefined));
    workflow.reviewDataset.and.returnValue(of(undefined));
    workflow.publishDataset.and.returnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        AdminWorkspaceFacade,
        provideRouter([]),
        { provide: AdminDatasetWorkflowService, useValue: workflow },
        { provide: DatasetService, useValue: datasetService },
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: toast },
      ],
    });

    facade = TestBed.inject(AdminWorkspaceFacade);
  });

  it('loads the reviewer queue and summary on init', () => {
    facade.init({ datasetId: 'ds-draft' });

    expect(workflow.getAdminQueueSummary).toHaveBeenCalled();
    expect(workflow.listAdminQueue).toHaveBeenCalled();
    expect(facade.items().length).toBe(2);
    expect(facade.selectedRecord()?.id).toBe('ds-draft');
    expect(facade.summary()).toEqual(queueSummary);
  });

  it('reloads the queue when the status filter changes', () => {
    facade.init();
    workflow.listAdminQueue.calls.reset();

    facade.setStatusFilter('draft');

    expect(workflow.listAdminQueue).toHaveBeenCalledWith(
      jasmine.objectContaining({ status: 'draft', page: 1 }),
    );
  });

  it('submits a dataset and shows a success message', () => {
    facade.init({ datasetId: 'ds-draft' });
    workflow.listAdminQueue.calls.reset();

    facade.submit('ds-draft');

    expect(workflow.submitForReview).toHaveBeenCalledWith('ds-draft');
    expect(toast.success).toHaveBeenCalledWith(
      'Submitted for review. An admin will approve or reject it.',
    );
    expect(workflow.listAdminQueue).toHaveBeenCalled();
    expect(datasetService.markCatalogStale).toHaveBeenCalled();
  });

  it('approves and publishes datasets through workflow actions', () => {
    facade.init({ datasetId: 'ds-review' });

    facade.approve('ds-review');
    expect(workflow.reviewDataset).toHaveBeenCalledWith('ds-review', 'approve');
    expect(toast.success).toHaveBeenCalledWith(
      'Dataset approved. You can now publish it.',
    );

    facade.publish('ds-review');
    expect(workflow.publishDataset).toHaveBeenCalledWith('ds-review');
    expect(toast.show).toHaveBeenCalledWith(
      jasmine.objectContaining({
        message: 'Dataset published. It is now visible in Discovery.',
        variant: 'success',
      }),
    );
    expect(facade.publishedId()).toBe('ds-review');
  });

  it('surfaces workflow errors', () => {
    workflow.submitForReview.and.returnValue(
      throwError(() => new Error('Submit failed')),
    );
    facade.init({ datasetId: 'ds-draft' });

    facade.submit('ds-draft');

    expect(toast.error).toHaveBeenCalledWith('Submit failed');
  });

  it('filters and paginates owned datasets for publishers', () => {
    TestBed.resetTestingModule();
    auth.canSeeAllDatasets.and.returnValue(false);

    TestBed.configureTestingModule({
      providers: [
        AdminWorkspaceFacade,
        provideRouter([]),
        { provide: AdminDatasetWorkflowService, useValue: workflow },
        { provide: DatasetService, useValue: datasetService },
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: toast },
      ],
    });

    const publisherFacade = TestBed.inject(AdminWorkspaceFacade);
    publisherFacade.init();

    expect(workflow.listOwnedQueue).toHaveBeenCalled();
    expect(workflow.listAdminQueue).not.toHaveBeenCalled();
    expect(workflow.getAdminQueueSummary).not.toHaveBeenCalled();
    expect(publisherFacade.scope).toBe('own');
    expect(publisherFacade.items().length).toBe(2);

    publisherFacade.setStatusFilter('in_review');

    expect(publisherFacade.items().length).toBe(1);
    expect(publisherFacade.items()[0].status).toBe('in_review');
    expect(publisherFacade.summary().in_review).toBe(1);
  });
});
