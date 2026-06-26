export interface Environment {
  production: boolean;
  /** When true, feature adapters use in-memory mocks instead of HTTP. */
  useMockApi: boolean;
  useMockExploreApi: boolean;
  apiBaseUrl: string;
  appName: string;
}
