export const TOPIC_INDICATOR_MAP: Record<string, string> = {
  population: 'population-growth',
  economy: 'cpi-inflation',
  agriculture: 'maize-yield',
};

export const DEFAULT_EXPLORE_INDICATOR = 'population-growth';

export function resolveIndicatorForTopic(topicSlug: string): string {
  return TOPIC_INDICATOR_MAP[topicSlug] ?? DEFAULT_EXPLORE_INDICATOR;
}
