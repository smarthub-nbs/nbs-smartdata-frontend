import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { Dataset, DatasetService } from '@app/features/discovery';
import {
  SmartSearchResponse,
  SmartSearchResult,
} from '@app/features/search/models/smart-search.model';
import { AiAnswerService } from '@app/features/search/services/ai-answer.service';
import { TispSearchService } from '@app/features/search/services/tisp-search.service';

interface ParsedQuery {
  tokens: string[];
  regions: string[];
  topics: string[];
  years: number[];
}

const REGION_ALIASES: Record<string, string> = {
  dodoma: 'Dodoma',
  dar: 'Dar es Salaam',
  'dar es salaam': 'Dar es Salaam',
  mwanza: 'Mwanza',
  arusha: 'Arusha',
  national: 'National',
  tanzania: 'National',
  mainland: 'Mainland',
  zanzibar: 'Zanzibar',
};

const TOPIC_KEYWORDS: Record<string, string[]> = {
  population: ['population', 'demography', 'projection', 'housing', 'vital'],
  census: ['census'],
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
  water: ['water', 'sewerage', 'water supply', 'connection', 'consumption'],
  tourism: ['tourism', 'visitor', 'visitors', 'inbound', 'receipts'],
  government: ['government', 'expenditure', 'revenue', 'projection', 'collection'],
  industry: ['industry', 'industries', 'industrial', 'licence', 'license'],
  justice: ['justice', 'court', 'case', 'backlog', 'filed', 'decided'],
};

@Injectable({ providedIn: 'root' })
export class SmartSearchService {
  private readonly datasetService = inject(DatasetService);
  private readonly tispSearch = inject(TispSearchService);
  private readonly aiAnswer = inject(AiAnswerService);

  smartSearch(query: string): Observable<SmartSearchResponse> {
    const trimmed = query.trim();
    const parsed = this.parseQuery(trimmed);

    return forkJoin({
      catalog: this.datasetService.searchCatalog(trimmed),
      tisp: this.tispSearch.search(trimmed),
    }).pipe(
      map(({ catalog, tisp }) => {
        const datasets = this.mergeDatasets(catalog, tisp);
        const results = this.scoreDatasets(datasets, parsed, trimmed);
        const answerFacts = this.buildAnswerFacts(results);
        return {
          query: trimmed,
          answer: this.buildAnswer(trimmed, results, answerFacts),
          answerFacts,
          usedAi: false,
          aiModel: null,
          interpretation: this.buildInterpretation(parsed, results.length),
          results,
          suggestedIndicators: this.suggestIndicators(parsed),
        };
      }),
      switchMap((response) => this.enhanceWithAi(response)),
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
    const rangeMatch = /(\d{4})\s*[-–]\s*(\d{4})/.exec(normalized);
    if (rangeMatch) {
      years.push(Number(rangeMatch[1]), Number(rangeMatch[2]));
    } else {
      const yearPattern = /\b(?:19|20)\d{2}\b/g;
      let yearMatch = yearPattern.exec(normalized);
      while (yearMatch) {
        years.push(Number(yearMatch[0]));
        yearMatch = yearPattern.exec(normalized);
      }
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

  private buildAnswer(
    query: string,
    results: SmartSearchResult[],
    facts: string[],
  ): string {
    if (results.length === 0) {
      return `I could not find a matching NBS/TISP data record for "${query}". Try a broader topic, area, or year.`;
    }

    const externalResults = results.filter(
      (result) => result.dataset.sourceUrl,
    );
    const primary = externalResults[0] ?? results[0];

    if (facts.length > 0) {
      const additionalFacts = facts.slice(1, 3);
      return [
        `Based on the NBS/TISP data I found, ${facts[0]}`,
        additionalFacts.length
          ? `I also found ${additionalFacts.join(' ')}`
          : '',
      ]
        .filter(Boolean)
        .join(' ');
    }

    return `Based on the NBS/TISP sources, the closest match is "${primary.dataset.title}". ${primary.dataset.description}`;
  }

  private buildAnswerFacts(results: SmartSearchResult[]): string[] {
    const dataFacts = results
      .map((result) => result.dataset.dataSummary)
      .filter((fact): fact is string => Boolean(fact))
      .filter((fact, index, facts) => facts.indexOf(fact) === index);

    if (dataFacts.length > 0) {
      return dataFacts.slice(0, 4);
    }

    return results
      .filter(
        (result) => result.dataset.sourceUrl || result.dataset.dataSummary,
      )
      .map((result) => {
        if (result.dataset.dataSummary) {
          return result.dataset.dataSummary;
        }
        return `${result.dataset.title}: ${result.dataset.description}`;
      })
      .filter((fact, index, facts) => facts.indexOf(fact) === index)
      .slice(0, 4);
  }

  private mergeDatasets(catalog: Dataset[], external: Dataset[]): Dataset[] {
    return [
      ...new Map(
        [...external, ...catalog].map((dataset) => [dataset.id, dataset]),
      ).values(),
    ];
  }

  private enhanceWithAi(
    response: SmartSearchResponse,
  ): Observable<SmartSearchResponse> {
    if (response.results.length === 0) {
      return of(response);
    }

    return this.aiAnswer
      .generateAnswer({
        query: response.query,
        deterministicAnswer: response.answer,
        facts: response.answerFacts,
        results: response.results,
      })
      .pipe(
        map((aiResponse) => ({
          ...response,
          answer: aiResponse.answer || response.answer,
          usedAi: aiResponse.usedAi,
          aiModel: aiResponse.model,
        })),
        catchError(() => of(response)),
      );
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
