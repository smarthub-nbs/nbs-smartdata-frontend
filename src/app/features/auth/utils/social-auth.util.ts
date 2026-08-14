import { environment } from '@env/environment';

const GITHUB_STATE_KEY = 'nbs_github_oauth_state';
const GITHUB_VERIFIER_KEY = 'nbs_github_oauth_verifier';
const GITHUB_RETURN_URL_KEY = 'nbs_github_oauth_return';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
            }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

export function isGoogleSignInConfigured(): boolean {
  return Boolean(environment.googleClientId.trim());
}

export function isGitHubSignInConfigured(): boolean {
  return Boolean(environment.githubClientId.trim());
}

export function githubRedirectUri(): string {
  return `${globalThis.location.origin}/auth/github/callback`;
}

export async function requestGoogleAccessToken(): Promise<string> {
  await ensureGoogleScript();
  const clientId = environment.googleClientId.trim();
  if (!clientId || !globalThis.window.google) {
    throw new Error('Google sign-in is not configured.');
  }

  return new Promise((resolve, reject) => {
    const client = globalThis.window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || 'Google sign-in was cancelled.'));
          return;
        }
        resolve(response.access_token);
      },
    });
    client.requestAccessToken();
  });
}

export async function beginGitHubSignIn(returnUrl: string): Promise<void> {
  const clientId = environment.githubClientId.trim();
  if (!clientId) {
    throw new Error('GitHub sign-in is not configured.');
  }

  const state = createRandomString(32);
  const verifier = createRandomString(64);
  const challenge = await createCodeChallenge(verifier);

  sessionStorage.setItem(GITHUB_STATE_KEY, state);
  sessionStorage.setItem(GITHUB_VERIFIER_KEY, verifier);
  sessionStorage.setItem(GITHUB_RETURN_URL_KEY, returnUrl);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: githubRedirectUri(),
    scope: 'read:user user:email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  globalThis.location.assign(
    `https://github.com/login/oauth/authorize?${params.toString()}`,
  );
}

export function consumeGitHubCallback(params: URLSearchParams): {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  returnUrl: string;
} {
  const expectedState = sessionStorage.getItem(GITHUB_STATE_KEY);
  const codeVerifier = sessionStorage.getItem(GITHUB_VERIFIER_KEY);
  const returnUrl = sessionStorage.getItem(GITHUB_RETURN_URL_KEY) || '/';
  const state = params.get('state');
  const code = params.get('code');

  sessionStorage.removeItem(GITHUB_STATE_KEY);
  sessionStorage.removeItem(GITHUB_VERIFIER_KEY);
  sessionStorage.removeItem(GITHUB_RETURN_URL_KEY);

  if (!code || !state || !expectedState || state !== expectedState) {
    throw new Error('GitHub sign-in state is invalid. Please try again.');
  }
  if (!codeVerifier) {
    throw new Error('GitHub sign-in session expired. Please try again.');
  }

  return {
    code,
    redirectUri: githubRedirectUri(),
    codeVerifier,
    returnUrl,
  };
}

function ensureGoogleScript(): Promise<void> {
  if (globalThis.window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-nbs-google-gsi]',
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google sign-in.')),
        { once: true },
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.dataset['nbsGoogleGsi'] = 'true';
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('Failed to load Google sign-in.')),
      { once: true },
    );
    document.head.appendChild(script);
  });
}

function createRandomString(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function createCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
