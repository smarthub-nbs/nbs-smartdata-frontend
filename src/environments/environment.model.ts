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
  /** Google OAuth client ID for GIS token login; empty disables the button. */
  googleClientId: string;
  /** GitHub OAuth app client ID; empty disables the button. */
  githubClientId: string;
}
