import { Page } from '@playwright/test';

export type E2eUserRole = 'admin' | 'developer' | 'publisher' | 'member';

interface E2eUserProfile {
  id: string;
  name: string;
  email: string;
  role: E2eUserRole;
  initials: string;
  isVerified: boolean;
}

const USER_PROFILES: Record<E2eUserRole, E2eUserProfile> = {
  admin: {
    id: 'e2e-admin',
    name: 'E2E Admin',
    email: 'admin@e2e.test',
    role: 'admin',
    initials: 'EA',
    isVerified: true,
  },
  developer: {
    id: 'e2e-developer',
    name: 'E2E Developer',
    email: 'developer@e2e.test',
    role: 'developer',
    initials: 'ED',
    isVerified: true,
  },
  publisher: {
    id: 'e2e-publisher',
    name: 'E2E Publisher',
    email: 'publisher@e2e.test',
    role: 'publisher',
    initials: 'EP',
    isVerified: true,
  },
  member: {
    id: 'e2e-member',
    name: 'E2E Member',
    email: 'member@e2e.test',
    role: 'member',
    initials: 'EM',
    isVerified: true,
  },
};

function toMeResponse(role: E2eUserRole) {
  const profile = USER_PROFILES[role];
  const [firstName, ...lastParts] = profile.name.split(' ');

  return {
    success: true,
    message: 'ok',
    data: {
      id: profile.id,
      email: profile.email,
      first_name: firstName,
      last_name: lastParts.join(' '),
      is_verified: profile.isVerified,
      is_staff: role === 'admin' || role === 'publisher',
      is_superuser: role === 'admin',
      roles:
        role === 'admin'
          ? ['admin']
          : role === 'developer'
            ? ['developer']
            : role === 'publisher'
              ? ['publisher']
              : [],
    },
  };
}

export async function seedAuthSession(
  page: Page,
  role: E2eUserRole,
): Promise<void> {
  const profile = USER_PROFILES[role];

  await page.route('**/api/v1/auth/me/', async (route) => {
    await route.fulfill({ json: toMeResponse(role) });
  });

  await page.context().addInitScript(
    ({ accessToken, refreshToken, user }) => {
      localStorage.setItem('nbs_access_token', accessToken);
      localStorage.setItem('nbs_refresh_token', refreshToken);
      localStorage.setItem('nbs_user', JSON.stringify(user));
    },
    {
      accessToken: `e2e-access-${role}`,
      refreshToken: `e2e-refresh-${role}`,
      user: profile,
    },
  );
}

export async function mockLoginSuccess(
  page: Page,
  role: E2eUserRole = 'member',
): Promise<void> {
  await page.route('**/api/v1/auth/login/', async (route) => {
    await route.fulfill({
      json: {
        success: true,
        message: 'ok',
        data: {
          access: `e2e-access-${role}`,
          refresh: `e2e-refresh-${role}`,
        },
      },
    });
  });

  await page.route('**/api/v1/auth/me/', async (route) => {
    await route.fulfill({ json: toMeResponse(role) });
  });
}

export async function mockLoginFailure(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/login/', async (route) => {
    await route.fulfill({
      status: 401,
      json: {
        success: false,
        error: { message: 'Invalid email or password.' },
      },
    });
  });
}
