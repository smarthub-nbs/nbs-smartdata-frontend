import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '@app/core/services/api.service';
import {
  AdminDatasetMetadataForm,
  BackendAdminDataset,
} from '@app/features/admin/models/admin-dataset.model';
import { AdminDatasetWorkflowService } from '@app/features/admin/services/admin-dataset-workflow.service';

describe('AdminDatasetWorkflowService', () => {
  let service: AdminDatasetWorkflowService;
  let api: jasmine.SpyObj<Pick<ApiService, 'get' | 'post' | 'patch'>>;

  const form: AdminDatasetMetadataForm = {
    title: 'Climate Statistics',
    description: 'Annual climate observations.',
    license: 'CC-BY-4.0',
    frequency: 'annual',
    region: 'East Africa',
    year: 2024,
  };

  const payload = {
    title: 'Climate Statistics',
    description: 'Annual climate observations.',
    license: 'CC-BY-4.0',
    frequency: 'annual',
    region: 'East Africa',
    year: 2024,
  };

  const datasetBase: BackendAdminDataset = {
    id: 'dataset-1',
    slug: 'climate-data',
    status: 'draft',
    visibility: false,
    category: null,
  };

  const datasetWithMetadata = (
    metadataId: string,
    title = 'Existing title',
  ): BackendAdminDataset => ({
    ...datasetBase,
    metadata: [
      {
        id: metadataId,
        title,
        description: 'Existing description',
        license: 'CC-BY-4.0',
        frequency: 'annual',
        region: 'East Africa',
        year: 2024,
        publisher_name: 'NBS',
      },
    ],
  });

  beforeEach(() => {
    api = jasmine.createSpyObj('ApiService', ['get', 'post', 'patch']);
    api.post.and.returnValue(of({}));
    api.patch.and.returnValue(of({}));

    TestBed.configureTestingModule({
      providers: [
        AdminDatasetWorkflowService,
        { provide: ApiService, useValue: api },
      ],
    });

    service = TestBed.inject(AdminDatasetWorkflowService);
  });

  describe('saveMetadata', () => {
    it('patches when metadataId is provided', () => {
      api.get.and.returnValue(of(datasetWithMetadata('meta-1')));

      service.saveMetadata('dataset-1', 'meta-1', form).subscribe();

      expect(api.patch).toHaveBeenCalledWith(
        '/v1/dataset/metadata/meta-1/',
        payload,
      );
      expect(api.post).not.toHaveBeenCalled();
      expect(api.get).toHaveBeenCalledWith('/v1/dataset/dataset-1/');
    });

    it('posts when metadataId is null and the dataset has no metadata', () => {
      api.get.and.returnValue(of({ ...datasetBase, metadata: [] }));

      service.saveMetadata('dataset-1', null, form).subscribe();

      expect(api.post).toHaveBeenCalledWith('/v1/dataset/metadata/', {
        ...payload,
        dataset_id: 'dataset-1',
      });
      expect(api.patch).not.toHaveBeenCalled();
      expect(api.get).toHaveBeenCalledTimes(2);
      expect(api.get).toHaveBeenCalledWith('/v1/dataset/dataset-1/');
    });

    it('patches after resolving metadataId from the dataset when metadataId is null', () => {
      api.get.and.returnValue(of(datasetWithMetadata('meta-2')));

      service.saveMetadata('dataset-1', null, form).subscribe();

      expect(api.patch).toHaveBeenCalledWith(
        '/v1/dataset/metadata/meta-2/',
        payload,
      );
      expect(api.post).not.toHaveBeenCalled();
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('createTag', () => {
    it('posts a trimmed tag name to the tags endpoint', () => {
      const createdTag = {
        id: 'tag-1',
        name: 'Open Data',
        slug: 'open-data',
      };
      api.post.and.returnValue(of(createdTag));

      let result: typeof createdTag | undefined;
      service.createTag('  Open Data  ').subscribe((tag) => {
        result = tag;
      });

      expect(api.post).toHaveBeenCalledWith('/v1/dataset/tags/', {
        name: 'Open Data',
      });
      expect(result).toEqual(createdTag);
    });
  });

  describe('tag links', () => {
    const tags = [
      { id: 'tag-1', name: 'Population', slug: 'population' },
      { id: 'tag-2', name: 'Health', slug: 'health' },
    ];

    it('links an existing tag by id', () => {
      service.linkTagById('dataset-1', 'tag-1').subscribe();

      expect(api.post).toHaveBeenCalledWith('/v1/dataset/tag-links/', {
        dataset_id: 'dataset-1',
        tag_id: 'tag-1',
      });
    });

    it('links an existing tag by name without creating a new tag', () => {
      api.get.and.returnValue(of(tags));

      service.linkTagByName('dataset-1', 'Population', false).subscribe();

      expect(api.get).toHaveBeenCalledWith('/v1/dataset/tags/');
      expect(api.post).toHaveBeenCalledWith('/v1/dataset/tag-links/', {
        dataset_id: 'dataset-1',
        tag_id: 'tag-1',
      });
      expect(api.post).toHaveBeenCalledTimes(1);
    });

    it('creates and links a tag by name when creation is allowed', () => {
      api.get.and.returnValue(of(tags));
      api.post.and.returnValues(
        of({ id: 'tag-3', name: 'Climate', slug: 'climate' }),
        of({}),
      );

      service.linkTagByName('dataset-1', 'Climate', true).subscribe();

      expect(api.post).toHaveBeenCalledWith('/v1/dataset/tags/', {
        name: 'Climate',
      });
      expect(api.post).toHaveBeenCalledWith('/v1/dataset/tag-links/', {
        dataset_id: 'dataset-1',
        tag_id: 'tag-3',
      });
    });

    it('rejects unknown tag names when creation is not allowed', (done) => {
      api.get.and.returnValue(of(tags));

      service.linkTagByName('dataset-1', 'New Topic', false).subscribe({
        next: () => fail('expected error'),
        error: (error: unknown) => {
          expect((error as Error).message).toBe(
            'Choose an existing tag from the list. Only admins can create new tags.',
          );
          expect(api.post).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('lists tag links scoped to a dataset', () => {
      api.get.and.returnValue(
        of([
          {
            id: 'link-1',
            dataset: { id: 'dataset-1' },
            tag: { id: 'tag-1', name: 'Population', slug: 'population' },
          },
        ]),
      );

      let result: unknown;
      service.listTagLinks('dataset-1').subscribe((links) => {
        result = links;
      });

      expect(api.get).toHaveBeenCalledWith('/v1/dataset/tag-links/', {
        dataset: 'dataset-1',
      });
      expect(result).toEqual([
        {
          linkId: 'link-1',
          tagId: 'tag-1',
          tagName: 'Population',
          tagSlug: 'population',
        },
      ]);
    });
  });
});
