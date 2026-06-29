import {
  Dataset,
  DatasetTopic,
} from '@app/features/discovery/models/dataset.model';
import {
  buildPublishedTopics,
  isMeaningfulTopic,
} from '@app/features/discovery/utils/dataset-topic.util';

const dataset = (
  topicSlug: string,
  topicName: string,
  id = 'dataset-1',
): Dataset => ({
  id,
  title: 'Sample',
  description: 'Sample data',
  topicSlug,
  topicName,
  format: 'CSV',
  frequency: 'Annual',
  region: 'National',
  keywords: [],
  publisher: 'NBS',
  updatedAt: '2026-01-01',
  recordCount: 1,
  license: 'Open',
});

describe('dataset-topic.util', () => {
  it('treats uncategorized topics as not meaningful', () => {
    expect(isMeaningfulTopic('Uncategorized', 'uncategorized')).toBeFalse();
    expect(isMeaningfulTopic('Population', 'population')).toBeTrue();
  });

  it('returns only topics with at least one published dataset', () => {
    const topics: DatasetTopic[] = [
      {
        id: '1',
        slug: 'population',
        name: 'Population',
        description: '',
        datasetCount: 0,
      },
      {
        id: '2',
        slug: 'health',
        name: 'Health',
        description: '',
        datasetCount: 0,
      },
    ];

    const published = buildPublishedTopics(topics, [
      dataset('population', 'Population'),
    ]);

    expect(published.map((topic) => topic.slug)).toEqual(['population']);
    expect(published[0]?.datasetCount).toBe(1);
  });

  it('derives topics from datasets when taxonomy entries are missing', () => {
    const published = buildPublishedTopics(
      [],
      [dataset('economy', 'Economy & labour')],
    );

    expect(published).toEqual([
      jasmine.objectContaining({
        slug: 'economy',
        name: 'Economy & labour',
        datasetCount: 1,
      }),
    ]);
  });
});
