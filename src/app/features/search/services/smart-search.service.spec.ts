import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Dataset } from '@app/features/discovery/models/dataset.model';
import { DatasetService } from '@app/features/discovery/services/dataset.service';
import { AiAnswerService } from '@app/features/search/services/ai-answer.service';
import { SmartSearchService } from '@app/features/search/services/smart-search.service';
import { TispSearchService } from '@app/features/search/services/tisp-search.service';

const gdpDataset: Dataset = {
  id: 'gdp-national-accounts',
  title: 'Gross Domestic Product — quarterly national accounts',
  description: 'Quarterly GDP at current and constant prices.',
  topicSlug: 'economy',
  topicName: 'Economy & labour',
  format: 'JSON',
  frequency: 'Quarterly',
  region: 'National',
  keywords: ['gdp', 'national accounts'],
  publisher: 'NBS',
  updatedAt: '2025-02-10',
  recordCount: 100,
  license: 'Open Government Licence - Tanzania',
};

const censusDataset: Dataset = {
  id: 'population-census',
  title: 'Population and housing census',
  description: 'Census tables by age and region.',
  topicSlug: 'census',
  topicName: 'Census',
  format: 'CSV',
  frequency: 'Annual',
  region: 'National',
  keywords: ['census'],
  publisher: 'NBS',
  updatedAt: '2025-03-10',
  recordCount: 250,
  license: 'Open Government Licence - Tanzania',
};

const tispPopulationDataset: Dataset = {
  id: 'external-tisp-census-population-tz-2022',
  title: 'Population size in Tanzania (2022)',
  description:
    'TISP census data reports 61,741,120 for Tanzania in 2022. Area level: LVL1.',
  topicSlug: 'population',
  topicName: 'Population',
  format: 'JSON',
  frequency: 'Annual',
  region: 'National',
  keywords: ['TISP', 'census', 'population', 'Tanzania', '2022'],
  publisher: 'National Bureau of Statistics',
  updatedAt: '2026-07-02',
  recordCount: 1,
  license: 'Official NBS public data',
  sourceUrl: 'https://tisp.nbs.go.tz:8000/census/dmdata/',
  dataSummary: 'Population size in Tanzania was 61,741,120 in 2022.',
};

const dodomaPopulationDataset: Dataset = {
  ...tispPopulationDataset,
  id: 'external-tisp-census-population-dodoma-2022',
  title: 'Population size in Dodoma (2022)',
  description: 'TISP census population data for Dodoma in 2022.',
  region: 'Dodoma',
  keywords: ['TISP', 'census', 'population', 'Dodoma', '2022'],
  dataSummary: 'Population size in Dodoma was 3,085,625 in 2022.',
};

const arushaPopulationBySexDataset: Dataset = {
  ...tispPopulationDataset,
  id: 'nbs-2022-phc-region-sex-arusha',
  title: 'Arusha Region population by sex — 2022 PHC',
  description: 'Official NBS 2022 census totals for Arusha Region.',
  region: 'Arusha',
  keywords: ['NBS', 'census', 'population', 'Arusha', 'male', 'female'],
  sourceUrl:
    'https://www.nbs.go.tz/uploads/statistics/documents/official-report.pdf',
  dataSummary:
    'Total population in Arusha Region was 2,356,255 in 2022; Female population in Arusha Region was 1,230,639 (52.2%) in 2022; Male population in Arusha Region was 1,125,616 (47.8%) in 2022.',
};

describe('SmartSearchService', () => {
  let service: SmartSearchService;
  let datasetService: jasmine.SpyObj<DatasetService>;
  let tispSearchService: jasmine.SpyObj<TispSearchService>;
  let aiAnswerService: jasmine.SpyObj<AiAnswerService>;

  beforeEach(() => {
    datasetService = jasmine.createSpyObj('DatasetService', ['searchCatalog']);
    datasetService.searchCatalog.and.returnValue(of([gdpDataset]));
    tispSearchService = jasmine.createSpyObj('TispSearchService', ['search']);
    tispSearchService.search.and.returnValue(of([]));
    aiAnswerService = jasmine.createSpyObj('AiAnswerService', [
      'generateAnswer',
    ]);
    aiAnswerService.generateAnswer.and.returnValue(
      of({
        answer: '',
        usedAi: false,
        model: null,
        reason: 'openai_not_configured',
      }),
    );

    TestBed.configureTestingModule({
      providers: [
        SmartSearchService,
        { provide: DatasetService, useValue: datasetService },
        { provide: TispSearchService, useValue: tispSearchService },
        { provide: AiAnswerService, useValue: aiAnswerService },
      ],
    });

    service = TestBed.inject(SmartSearchService);
  });

  it('returns ranked results for economy-related queries', (done) => {
    service.smartSearch('gdp growth').subscribe((response) => {
      expect(response.query).toBe('gdp growth');
      expect(response.answer).toContain('closest match');
      expect(response.results.length).toBeGreaterThan(0);
      expect(response.results[0]?.dataset.id).toBe('gdp-national-accounts');
      expect(response.interpretation).toContain('Economy');
      done();
    });
  });

  it('returns census category datasets for census queries', (done) => {
    datasetService.searchCatalog.and.returnValue(of([censusDataset]));

    service.smartSearch('census').subscribe((response) => {
      expect(response.results.length).toBeGreaterThan(0);
      expect(response.results[0]?.dataset.id).toBe('population-census');
      expect(response.interpretation).toContain('Census');
      done();
    });
  });

  it('suggests economy indicators for GDP queries', (done) => {
    service.smartSearch('gdp').subscribe((response) => {
      expect(response.suggestedIndicators).toContain('GDP growth');
      done();
    });
  });

  it('builds a conversational answer from TISP data summaries', (done) => {
    datasetService.searchCatalog.and.returnValue(of([]));
    tispSearchService.search.and.returnValue(of([tispPopulationDataset]));

    service.smartSearch('population Tanzania 2022').subscribe((response) => {
      expect(response.answer).toContain(
        'Population size in Tanzania was 61,741,120 in 2022.',
      );
      expect(response.answerFacts).toEqual([
        'Population size in Tanzania was 61,741,120 in 2022.',
      ]);
      expect(response.usedAi).toBeFalse();
      done();
    });
  });

  it('uses the backend AI answer when it is available', (done) => {
    datasetService.searchCatalog.and.returnValue(of([]));
    tispSearchService.search.and.returnValue(of([tispPopulationDataset]));
    aiAnswerService.generateAnswer.and.returnValue(
      of({
        answer:
          'AI summary: Tanzania population was 61,741,120 in 2022 according to NBS/TISP.',
        usedAi: true,
        model: 'gpt-test',
        reason: '',
      }),
    );

    service.smartSearch('population Tanzania 2022').subscribe((response) => {
      expect(response.answer).toBe(
        'AI summary: Tanzania population was 61,741,120 in 2022 according to NBS/TISP.',
      );
      expect(response.usedAi).toBeTrue();
      expect(response.aiModel).toBe('gpt-test');
      done();
    });
  });

  it('normalizes conversational population queries and region abbreviations', (done) => {
    datasetService.searchCatalog.and.returnValue(of([]));
    tispSearchService.search.and.returnValue(of([dodomaPopulationDataset]));
    aiAnswerService.generateAnswer.and.returnValue(
      of({
        answer: 'Dodoma had 3,085,625 people in 2022.',
        usedAi: true,
        model: 'openrouter/free',
        reason: '',
      }),
    );

    service.smartSearch('number of people in dom').subscribe((response) => {
      expect(datasetService.searchCatalog).toHaveBeenCalledWith(
        'population dodoma',
      );
      expect(tispSearchService.search).toHaveBeenCalledWith(
        'population dodoma',
      );
      expect(response.query).toBe('number of people in dom');
      expect(response.results[0]?.dataset.region).toBe('Dodoma');
      expect(response.answer).toBe('Dodoma had 3,085,625 people in 2022.');
      expect(response.usedAi).toBeTrue();
      done();
    });
  });

  it('supports Swahili population queries and asks AI with the original wording', (done) => {
    datasetService.searchCatalog.and.returnValue(of([]));
    tispSearchService.search.and.returnValue(of([dodomaPopulationDataset]));
    aiAnswerService.generateAnswer.and.returnValue(
      of({
        answer: 'Dodoma ilikuwa na watu 3,085,625 mwaka 2022.',
        usedAi: true,
        model: 'openrouter/free',
        reason: '',
      }),
    );

    service.smartSearch('idadi ya watu dom').subscribe((response) => {
      expect(datasetService.searchCatalog).toHaveBeenCalledWith(
        'population dodoma',
      );
      expect(tispSearchService.search).toHaveBeenCalledWith(
        'population dodoma',
      );
      expect(aiAnswerService.generateAnswer).toHaveBeenCalledWith(
        jasmine.objectContaining({ query: 'idadi ya watu dom' }),
      );
      expect(response.answer).toBe(
        'Dodoma ilikuwa na watu 3,085,625 mwaka 2022.',
      );
      expect(response.usedAi).toBeTrue();
      done();
    });
  });

  it('uses a Swahili fallback answer when AI is unavailable', (done) => {
    datasetService.searchCatalog.and.returnValue(of([]));
    tispSearchService.search.and.returnValue(of([dodomaPopulationDataset]));

    service.smartSearch('idadi ya watu Dodoma').subscribe((response) => {
      expect(response.answer).toContain('Kulingana na data ya NBS/TISP');
      expect(response.answer).toContain('idadi ya watu katika Dodoma');
      expect(response.answer).toContain('3,085,625');
      expect(response.usedAi).toBeFalse();
      done();
    });
  });

  it('normalizes a Swahili sex breakdown and source request', (done) => {
    datasetService.searchCatalog.and.returnValue(of([]));
    tispSearchService.search.and.returnValue(
      of([arushaPopulationBySexDataset]),
    );
    aiAnswerService.generateAnswer.and.returnValue(
      of({
        answer:
          'Mkoa wa Arusha ulikuwa na watu 2,356,255: wanawake 1,230,639 na wanaume 1,125,616. Chanzo ni ripoti rasmi ya NBS.',
        usedAi: true,
        model: 'openrouter/free',
        reason: '',
      }),
    );

    service
      .smartSearch(
        'idadi ya watu arusha wanawake na wanaume. na uniambia umetoa wapi hii taarifa',
      )
      .subscribe((response) => {
        expect(datasetService.searchCatalog).toHaveBeenCalledWith(
          'population arusha female male',
        );
        expect(tispSearchService.search).toHaveBeenCalledWith(
          'population arusha female male',
        );
        expect(aiAnswerService.generateAnswer).toHaveBeenCalledWith(
          jasmine.objectContaining({
            query:
              'idadi ya watu arusha wanawake na wanaume. na uniambia umetoa wapi hii taarifa',
          }),
        );
        expect(response.usedAi).toBeTrue();
        expect(response.answer).toContain('2,356,255');
        done();
      });
  });

  it('normalizes the Arusha example button query', (done) => {
    datasetService.searchCatalog.and.returnValue(of([]));
    tispSearchService.search.and.returnValue(
      of([arushaPopulationBySexDataset]),
    );

    service
      .smartSearch(
        'idadi ya watu Arusha wanawake na wanaume. niambie chanzo cha taarifa',
      )
      .subscribe(() => {
        expect(datasetService.searchCatalog).toHaveBeenCalledWith(
          'population arusha female male',
        );
        expect(tispSearchService.search).toHaveBeenCalledWith(
          'population arusha female male',
        );
        done();
      });
  });
});
