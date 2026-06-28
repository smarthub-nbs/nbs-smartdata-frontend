export interface Environment {
  production: boolean;
  /** When true, feature adapters use in-memory mocks instead of HTTP. */
  useMockApi: boolean;
  useMockExploreApi: boolean;
  apiBaseUrl: string;
  appName: string;
  /** Sign out after this many ms without user activity; 0 disables idle timeout. */
  sessionIdleTimeoutMs: number;
  /** Show a countdown warning this many ms before idle sign-out; 0 skips the warning. */
  sessionIdleWarningMs: number;
}
