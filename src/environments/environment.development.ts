import { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  useMockApi: false,
  useMockExploreApi: false,
  apiBaseUrl: '/api',
  appName: 'NBS SmartData Hub',
  sessionIdleTimeoutMs: 5 * 60 * 1000,
  sessionIdleWarningMs: 30 * 1000,
  // Set GOOGLE_CLIENT_ID / paste Web client ID here to enable Google login locally.
  googleClientId: '',
  // Set GitHub OAuth App client ID here; callback: http://localhost:4200/auth/github/callback
  githubClientId: '',
};
