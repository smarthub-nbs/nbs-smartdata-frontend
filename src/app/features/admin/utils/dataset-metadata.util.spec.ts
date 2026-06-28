import {
  matchesDatasetId,
  resolveDatasetMetadata,
  resolveDatasetTitle,
} from '@app/features/admin/utils/dataset-metadata.util';

describe('dataset-metadata.util', () => {
  it('prefers the newest metadata record with populated title or description', () => {
    const records = [
      { id: '1', title: '', description: '' },
      { id: '2', title: 'Latest title', description: '' },
    ];

    expect(resolveDatasetMetadata(records)?.id).toBe('2');
    expect(resolveDatasetTitle(records, 'fallback-slug')).toBe('Latest title');
  });

  it('matches dataset ids from string or nested object shapes', () => {
    expect(matchesDatasetId('abc', 'abc')).toBeTrue();
    expect(matchesDatasetId({ id: 'abc' }, 'abc')).toBeTrue();
    expect(matchesDatasetId({ id: 'other' }, 'abc')).toBeFalse();
  });
});
