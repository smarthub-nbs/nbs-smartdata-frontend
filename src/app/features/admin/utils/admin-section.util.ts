export type AdminSection = 'publishing' | 'taxonomy' | 'activity';

const VALID_SECTIONS = new Set<AdminSection>([
  'publishing',
  'taxonomy',
  'activity',
]);

export function parseAdminSection(
  value: string | null,
  canManageTaxonomy: boolean,
): AdminSection {
  if (!value || !VALID_SECTIONS.has(value as AdminSection)) {
    return 'publishing';
  }
  if (value === 'taxonomy' && !canManageTaxonomy) {
    return 'publishing';
  }
  return value as AdminSection;
}
