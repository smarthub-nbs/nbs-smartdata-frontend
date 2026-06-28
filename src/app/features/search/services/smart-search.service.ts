import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Dataset, DatasetService } from '@app/features/discovery';
import {
  SmartSearchResponse,
  SmartSearchResult,
} from '@app/features/search/models/smart-search.model';

interface ParsedQuery {
  tokens: string[];
  regions: string[];
  topics: string[];
  years: number[];
}

const REGION_ALIASES: Record<string, string> = {
  dodoma: 'Dodoma',
  national: 'National',
  tanzania: 'National',
  mainland: 'National',
  zanzibar: 'National',
};

const TOPIC_KEYWORDS: Record<string, string[]> = {
  population: [
    'population',
    'census',
    'demography',
    'projection',
    'housing',
    'vital',
  ],
  economy: [
    'gdp',
    'economy',
    'economic',
    'inflation',
    'cpi',
    'price',
    'accounts',
    'trade',
  ],
  agriculture: [
    'agriculture',
    'crop',
    'maize',
    'rice',
    'cassava',
    'food',
    'yield',
  ],
  health: ['health', 'facility', 'hospital', 'disease'],
  education: ['education', 'school', 'enrolment', 'enrollment', 'student'],
};

@Injectable({ providedIn: 'root' })
export class SmartSearchService {
  private readonly datasetService = inject(DatasetService);

  smartSearch(query: string): Observable<SmartSearchResponse> {
    const trimmed = query.trim();
    const parsed = this.parseQuery(trimmed);

    return this.datasetService.searchCatalog(trimmed).pipe(
      map((datasets) => {
        const results = this.scoreDatasets(datasets, parsed, trimmed);
        return {
          query: trimmed,
          interpretation: this.buildInterpretation(parsed, results.length),
          results,
          suggestedIndicators: this.suggestIndicators(parsed),
        };
      }),
    );
  }

  getRecommendations(datasetId: string, limit = 3): Dataset[] {
    const source = this.datasetService.getById(datasetId);
    if (!source) {
      return [];
    }

    const candidates = this.datasetService
      .listDatasets()
      .filter((d) => d.id !== datasetId);

    return candidates
      .map((dataset) => ({
        dataset,
        score: this.recommendationScore(source, dataset),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.dataset);
  }

  private parseQuery(query: string): ParsedQuery {
    const normalized = query.toLowerCase();
    const tokens = normalized.split(/[\s,.;:!?]+/).filter(Boolean);

    const regions = new Set<string>();
    for (const [alias, region] of Object.entries(REGION_ALIASES)) {
      if (normalized.includes(alias)) {
        regions.add(region);
      }
    }

    const topics = new Set<string>();
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      if (keywords.some((kw) => normalized.includes(kw))) {
        topics.add(topic);
      }
    }

    const years: number[] = [];
    const rangeMatch = normalized.match(/(\d{4})\s*[-–]\s*(\d{4})/);
    if (rangeMatch) {
      years.push(Number(rangeMatch[1]), Number(rangeMatch[2]));
    } else {
      const yearMatches = normalized.match(/\b(19|20)\d{2}\b/g);
      yearMatches?.forEach((y) => years.push(Number(y)));
    }

    return { tokens, regions: [...regions], topics: [...topics], years };
  }

  private scoreDatasets(
    datasets: Dataset[],
    parsed: ParsedQuery,
    rawQuery: string,
  ): SmartSearchResult[] {
    const normalizedQuery = rawQuery.toLowerCase();

    return datasets
      .map((dataset) => {
        const { score, reasons } = this.scoreDataset(
          dataset,
          parsed,
          normalizedQuery,
        );
        return {
          dataset,
          relevanceScore: Math.min(99, Math.round(score)),
          matchReason: reasons.join(' · ') || 'Semantic match',
        };
      })
      .filter((r) => r.relevanceScore >= 25)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private scoreDataset(
    dataset: Dataset,
    parsed: ParsedQuery,
    normalizedQuery: string,
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    const haystack = [
      dataset.title,
      dataset.description,
      dataset.topicName,
      dataset.region,
      ...dataset.keywords,
    ]
      .join(' ')
      .toLowerCase();

    for (const token of parsed.tokens) {
      if (token.length < 3) {
        continue;
      }
      if (haystack.includes(token)) {
        score += 12;
      }
    }

    if (normalizedQuery.length > 10 && haystack.includes(normalizedQuery)) {
      score += 35;
      reasons.push('Phrase match');
    }

    if (parsed.regions.includes(dataset.region)) {
      score += 28;
      reasons.push(`Region: ${dataset.region}`);
    }

    if (parsed.topics.includes(dataset.topicSlug)) {
      score += 32;
      reasons.push(`Topic: ${dataset.topicName}`);
    }

    for (const keyword of dataset.keywords) {
      if (normalizedQuery.includes(keyword.toLowerCase())) {
        score += 18;
        reasons.push(`Tag: ${keyword}`);
        break;
      }
    }

    if (parsed.years.length > 0) {
      const yearText = dataset.title + dataset.description;
      if (parsed.years.some((y) => yearText.includes(String(y)))) {
        score += 15;
        reasons.push('Time period');
      }
    }

    return { score, reasons: [...new Set(reasons)].slice(0, 3) };
  }

  private buildInterpretation(
    parsed: ParsedQuery,
    resultCount: number,
  ): string {
    const parts: string[] = [];

    if (parsed.topics.length) {
      parts.push(
        `topics: ${parsed.topics.map((t) => t.replace(/^\w/, (c) => c.toUpperCase())).join(', ')}`,
      );
    }
    if (parsed.regions.length) {
      parts.push(`regions: ${parsed.regions.join(', ')}`);
    }
    if (parsed.years.length) {
      const min = Math.min(...parsed.years);
      const max = Math.max(...parsed.years);
      parts.push(min === max ? `year: ${min}` : `period: ${min}–${max}`);
    }

    const focus =
      parts.length > 0
        ? `Looking for datasets related to ${parts.join('; ')}.`
        : 'Searching across all national statistics metadata.';

    return `${focus} Found ${resultCount} relevant dataset(s).`;
  }

  private suggestIndicators(parsed: ParsedQuery): string[] {
    const indicators: string[] = [];

    if (parsed.topics.includes('population')) {
      indicators.push(
        'Total population',
        'Population growth rate',
        'Median age',
      );
    }
    if (parsed.topics.includes('economy')) {
      indicators.push('GDP growth', 'Consumer price index', 'Inflation rate');
    }
    if (parsed.topics.includes('agriculture')) {
      indicators.push('Crop yield', 'Area harvested', 'Production volume');
    }
    if (parsed.regions.includes('Dodoma')) {
      indicators.push('Dodoma regional population', 'Dodoma district counts');
    }

    return indicators.slice(0, 4);
  }

  private recommendationScore(source: Dataset, candidate: Dataset): number {
    let score = 0;
    if (candidate.topicSlug === source.topicSlug) {
      score += 50;
    }
    const sharedKeywords = candidate.keywords.filter((k) =>
      source.keywords.includes(k),
    );
    score += sharedKeywords.length * 20;
    if (candidate.region === source.region) {
      score += 15;
    }
    return score;
  }
}
