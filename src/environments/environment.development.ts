import { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  useMockApi: false,
  useMockExploreApi: true,
  apiBaseUrl: '/api',
  appName: 'NBS SmartData Hub',
  sessionIdleTimeoutMs: 5 * 60 * 1000,
  sessionIdleWarningMs: 30 * 1000,
};
