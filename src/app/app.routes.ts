import { Routes } from '@angular/router';
import { adminGuard } from '@app/core/guards/admin.guard';
import { authGuard } from '@app/core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@app/layout/site-layout/site-layout.component').then(
        (m) => m.SiteLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@app/features/home/home-page.component').then(
            (m) => m.HomePageComponent,
          ),
      },
      {
        path: 'login',
        loadComponent: () =>
          import('@app/features/auth/login-page.component').then(
            (m) => m.LoginPageComponent,
          ),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('@app/features/auth/register-page.component').then(
            (m) => m.RegisterPageComponent,
          ),
      },
      {
        path: 'datasets',
        loadComponent: () =>
          import('@app/features/discovery/datasets-page.component').then(
            (m) => m.DatasetsPageComponent,
          ),
      },
      {
        path: 'datasets/:id',
        loadComponent: () =>
          import('@app/features/discovery/dataset-detail-page.component').then(
            (m) => m.DatasetDetailPageComponent,
          ),
      },
      {
        path: 'topics/:slug',
        loadComponent: () =>
          import('@app/features/discovery/topic-page.component').then(
            (m) => m.TopicPageComponent,
          ),
      },
      {
        path: 'explore',
        loadComponent: () =>
          import('@app/features/explore/explore-page.component').then(
            (m) => m.ExplorePageComponent,
          ),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('@app/features/search/search-page.component').then(
            (m) => m.SearchPageComponent,
          ),
      },
      {
        path: 'developers',
        loadComponent: () =>
          import('@app/features/developers/developers-page.component').then(
            (m) => m.DevelopersPageComponent,
          ),
      },
      {
        path: 'account',
        canActivate: [authGuard],
        loadComponent: () =>
          import('@app/features/account/account-page.component').then(
            (m) => m.AccountPageComponent,
          ),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('@app/features/admin/admin-page.component').then(
            (m) => m.AdminPageComponent,
          ),
      },
      { path: 'dashboard', redirectTo: '', pathMatch: 'full' },
      { path: 'data', redirectTo: 'datasets', pathMatch: 'full' },
      { path: 'settings', redirectTo: 'account', pathMatch: 'full' },
      {
        path: '**',
        loadComponent: () =>
          import('@app/features/not-found/not-found-page.component').then(
            (m) => m.NotFoundPageComponent,
          ),
      },
    ],
  },
];
