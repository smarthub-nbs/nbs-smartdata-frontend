import { Page } from '@playwright/test';

type AdminQueueStatus =
  'draft' | 'in_review' | 'approved' | 'rejected' | 'published';

interface AdminQueueItem {
  id: string;
  slug: string;
  title: string;
  status: AdminQueueStatus;
  visibility: boolean;
  category_slug: string;
  category_name: string;
  has_metadata: boolean;
  has_tag: boolean;
  has_file: boolean;
  primary_file_id: string | null;
  updated_at: string;
  created_at: string;
}

interface ApiKeyRecord {
  id: string;
  consumer: { id: string; name: string };
  name: string;
  prefix: string;
  status: 'active' | 'revoked';
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
  scopes: string[];
}

interface ApiKeyRequestBody {
  name?: string;
}

const ADMIN_QUEUE_ITEM: AdminQueueItem = {
  id: 'ds-draft-1',
  slug: 'inflation-draft',
  title: 'Consumer price index draft',
  status: 'draft',
  visibility: false,
  category_slug: 'economy',
  category_name: 'Economy & labour',
  has_metadata: true,
  has_tag: false,
  has_file: false,
  primary_file_id: null,
  updated_at: '2025-01-15T10:00:00Z',
  created_at: '2025-01-10T10:00:00Z',
};

const ADMIN_QUEUE_SUMMARY = {
  total: 1,
  draft: 1,
  in_review: 0,
  approved: 0,
  rejected: 0,
  published: 0,
};

const ADMIN_QUEUE_RESPONSE = {
  items: [ADMIN_QUEUE_ITEM],
  pagination: {
    page: 1,
    page_size: 20,
    total_pages: 1,
    total_items: 1,
    has_next: false,
    has_previous: false,
    next: null,
    previous: null,
  },
};

const ADMIN_CATEGORIES = [
  { id: 'cat-economy', name: 'Economy & labour', slug: 'economy' },
];

const API_KEY_RECORD: ApiKeyRecord = {
  id: 'key-1',
  consumer: { id: 'consumer-1', name: 'E2E Developer' },
  name: 'Smoke test key',
  prefix: 'nbs_e2e',
  status: 'active',
  expires_at: null,
  last_used_at: null,
  revoked_at: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  scopes: ['gateway:read'],
};

export async function mockAdminWorkspace(page: Page): Promise<void> {
  await page.route('**/api/v1/dataset/admin-queue/summary/', async (route) => {
    await route.fulfill({ json: ADMIN_QUEUE_SUMMARY });
  });

  await page.route('**/api/v1/dataset/admin-queue/**', async (route) => {
    await route.fulfill({ json: ADMIN_QUEUE_RESPONSE });
  });

  await page.route('**/api/v1/dataset/categories/', async (route) => {
    await route.fulfill({ json: ADMIN_CATEGORIES });
  });

  await page.route('**/api/v1/dataset/tags/', async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.route('**/api/v1/dataset/ds-draft-1/**', async (route) => {
    await route.fulfill({
      json: {
        id: 'ds-draft-1',
        slug: 'inflation-draft',
        status: 'draft',
        visibility: false,
        category: ADMIN_CATEGORIES[0],
        metadata: [
          {
            id: 'meta-1',
            title: 'Consumer price index draft',
            description: 'Draft CPI dataset for smoke tests.',
            license: 'Open Government Licence - Tanzania',
            frequency: 'monthly',
            region: 'National',
            year: 2024,
            publisher_name: 'NBS',
          },
        ],
        tags: [],
        versions: [],
      },
    });
  });

  await page.route('**/api/v1/dataset/versions/**', async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.route('**/api/v1/dataset/files/**', async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.route('**/api/v1/dataset/tag-links/**', async (route) => {
    await route.fulfill({ json: [] });
  });
}

export async function mockDeveloperApiKeys(page: Page): Promise<void> {
  let keys = [{ ...API_KEY_RECORD }];

  await page.route('**/api/v1/developer/api-keys/', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          items: keys,
          pagination: {
            page: 1,
            page_size: 20,
            total_pages: 1,
            total_items: keys.length,
            has_next: false,
            has_previous: false,
            next: null,
            previous: null,
          },
        },
      });
      return;
    }

    await route.continue();
  });

  await page.route('**/api/v1/developer/api-keys/request/', async (route) => {
    const body = route.request().postDataJSON() as ApiKeyRequestBody;
    const issued = {
      ...API_KEY_RECORD,
      id: 'key-new',
      name: body.name ?? 'New key',
      api_key: 'nbs_e2e_new_secret_key_value',
    };
    keys = [issued, ...keys.filter((key) => key.id !== 'key-new')];

    await route.fulfill({ json: issued });
  });

  await page.route('**/api/v1/developer/api-keys/*/revoke/', async (route) => {
    const keyId = route.request().url().split('/api-keys/')[1]?.split('/')[0];
    keys = keys.map((key) =>
      key.id === keyId ? { ...key, status: 'revoked' as const } : key,
    );
    await route.fulfill({ json: { status: 'revoked' } });
  });
}

const USER_LIST_ITEM = {
  id: 'user-1',
  email: 'member@example.com',
  first_name: 'Member',
  last_name: 'User',
  is_active: true,
  is_verified: true,
  is_staff: false,
  is_superuser: false,
  groups: ['user'],
  created_at: '2025-01-01T00:00:00Z',
  last_login: null,
  last_login_at: null,
};

/** Stubs user management endpoints for admin smoke tests. */
export async function mockUsersWorkspace(page: Page): Promise<void> {
  await page.route(/\/api\/v1\/users(\/|$|\?)/, async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname.replace(/\/$/, '');

    if (pathname.endsWith('/users/groups')) {
      await route.fulfill({
        json: [{ id: 1, name: 'user', permissions: [] }],
      });
      return;
    }

    const detailMatch = pathname.match(/\/users\/([^/]+)$/);
    if (detailMatch && detailMatch[1] !== 'groups') {
      await route.fulfill({
        json: {
          ...USER_LIST_ITEM,
          permissions: [],
          updated_at: '2025-01-01T00:00:00Z',
        },
      });
      return;
    }

    if (pathname.endsWith('/users') && route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          items: [USER_LIST_ITEM],
          pagination: {
            page: 1,
            page_size: 10,
            total_pages: 1,
            total_items: 1,
            has_next: false,
            has_previous: false,
            next: null,
            previous: null,
          },
        },
      });
      return;
    }

    await route.continue();
  });
}
