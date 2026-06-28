import { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  useMockApi: true,
  useMockExploreApi: true,
  apiBaseUrl: '/api',
  appName: 'NBS SmartData Hub',
  sessionIdleTimeoutMs: 0,
  sessionIdleWarningMs: 0,
};
