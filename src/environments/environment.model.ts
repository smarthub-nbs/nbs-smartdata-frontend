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
  /**
   * Google OAuth client ID for GIS token login.
   * Set to your Google Cloud OAuth Web client ID to show the Google button on login.
   * Empty string keeps the button hidden.
   */
  googleClientId: string;
  /**
   * GitHub OAuth app client ID.
   * Set to your GitHub OAuth App client ID to show the GitHub button on login.
   * Local callback URL must be: http://localhost:4200/auth/github/callback
   * Empty string keeps the button hidden.
   */
  githubClientId: string;
}
