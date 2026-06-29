import {
  Dataset,
  DatasetTopic,
} from '@app/features/discovery/models/dataset.model';

export function isMeaningfulTopic(name: string, slug: string): boolean {
  const normalized = name.trim().toLowerCase();
  return normalized !== 'uncategorized' && slug !== 'uncategorized';
}

/** Topics visible in public discovery: only categories with at least one published dataset. */
export function buildPublishedTopics(
  topics: DatasetTopic[],
  datasets: Dataset[],
): DatasetTopic[] {
  const counts = datasets.reduce<Map<string, number>>((map, dataset) => {
    map.set(dataset.topicSlug, (map.get(dataset.topicSlug) ?? 0) + 1);
    return map;
  }, new Map());

  const topicBySlug = new Map(topics.map((topic) => [topic.slug, topic]));

  for (const dataset of datasets) {
    if (!topicBySlug.has(dataset.topicSlug)) {
      topicBySlug.set(dataset.topicSlug, {
        id: dataset.topicSlug,
        slug: dataset.topicSlug,
        name: dataset.topicName,
        description: `${dataset.topicName} datasets`,
        datasetCount: 0,
      });
    }
  }

  return [...topicBySlug.values()]
    .map((topic) => ({
      ...topic,
      datasetCount: counts.get(topic.slug) ?? 0,
    }))
    .filter(
      (topic) =>
        topic.datasetCount > 0 && isMeaningfulTopic(topic.name, topic.slug),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}
