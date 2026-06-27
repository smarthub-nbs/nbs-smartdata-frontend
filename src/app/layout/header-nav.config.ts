import { HeaderNavItem } from '@app/layout/models/nav-item.model';

export const HEADER_NAV_ITEMS: HeaderNavItem[] = [
  { label: 'Home', route: '/' },
  { label: 'Datasets', route: '/datasets' },
  { label: 'Explore', route: '/explore' },
  { label: 'Search', route: '/search' },
  { label: 'Developers', route: '/developers' },
  {
    label: 'My hub',
    route: '/account',
    roles: ['member', 'developer', 'publisher', 'admin'],
  },
  { label: 'Admin', route: '/admin', roles: ['publisher', 'admin'] },
];
