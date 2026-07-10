import { Environment } from './environment.model';

export const environment: Environment = {
  production: true,
  useMockApi: false,
  useMockExploreApi: false,
  apiBaseUrl: 'https://api.smartdata.nbs.go.tz',
  appName: 'NBS SmartData Hub',
  sessionIdleTimeoutMs: 5 * 60 * 1000,
  sessionIdleWarningMs: 30 * 1000,
  googleClientId: '',
  githubClientId: '',
};
