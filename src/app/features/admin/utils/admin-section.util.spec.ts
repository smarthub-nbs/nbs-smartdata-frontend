import { parseAdminSection } from '@app/features/admin/utils/admin-section.util';

describe('admin-section.util', () => {
  it('defaults to publishing for unknown sections', () => {
    expect(parseAdminSection(null, true)).toBe('publishing');
    expect(parseAdminSection('invalid', true)).toBe('publishing');
  });

  it('returns taxonomy when allowed', () => {
    expect(parseAdminSection('taxonomy', true)).toBe('taxonomy');
  });

  it('falls back to publishing when taxonomy is not allowed', () => {
    expect(parseAdminSection('taxonomy', false)).toBe('publishing');
  });

  it('returns activity section', () => {
    expect(parseAdminSection('activity', false)).toBe('activity');
  });
});
