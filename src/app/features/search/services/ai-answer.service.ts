import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '@app/core/services/api.service';
import { SmartSearchResult } from '@app/features/search/models/smart-search.model';

export interface AiAnswerRequest {
  query: string;
  deterministicAnswer: string;
  facts: string[];
  results: SmartSearchResult[];
}

export interface AiAnswerResponse {
  answer: string;
  usedAi: boolean;
  model: string | null;
  reason: string;
}

interface AiAnswerApiResult {
  answer: string;
  used_ai: boolean;
  model: string | null;
  reason: string;
}

@Injectable({ providedIn: 'root' })
export class AiAnswerService {
  private readonly api = inject(ApiService);

  generateAnswer(request: AiAnswerRequest): Observable<AiAnswerResponse> {
    return this.api
      .post<AiAnswerApiResult>('/v1/search/ai-answer/', {
        query: request.query,
        deterministic_answer: request.deterministicAnswer,
        facts: request.facts,
        results: request.results.slice(0, 5).map((result) => ({
          title: result.dataset.title,
          description: result.dataset.description,
          topic: result.dataset.topicName,
          region: result.dataset.region,
          source_url: result.dataset.sourceUrl ?? '',
          data_summary: result.dataset.dataSummary ?? '',
        })),
      })
      .pipe(map((response) => this.mapResponse(response)));
  }

  private mapResponse(response: AiAnswerApiResult): AiAnswerResponse {
    return {
      answer: response.answer,
      usedAi: response.used_ai,
      model: response.model,
      reason: response.reason,
    };
  }
}
