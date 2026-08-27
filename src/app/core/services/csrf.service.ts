import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '@env/environment';

interface CsrfTokenResponse {
  csrf_token: string;
  cookie_name: string;
  header_name: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class CsrfService {
  private readonly http = inject(HttpClient);
  private readonly token = signal<string | null>(null);
  private inflight: Observable<string> | null = null;

  /** Returns a CSRF token, fetching one when the cookie is not yet set. */
  ensureToken(): Observable<string> {
    const existing = this.getToken();
    if (existing) {
      return of(existing);
    }

    if (this.inflight) {
      return this.inflight;
    }

    this.inflight = this.http
      .get<ApiEnvelope<CsrfTokenResponse>>(
        `${environment.apiBaseUrl}/v1/auth/csrf/`,
        { withCredentials: true },
      )
      .pipe(
        map((response) => response.data.csrf_token),
        tap((value) => {
          this.token.set(value);
          this.inflight = null;
        }),
        shareReplay(1),
      );

    return this.inflight;
  }

  getToken(): string | null {
    return this.readCookie() ?? this.token();
  }

  clearToken(): void {
    this.token.set(null);
    this.inflight = null;
  }

  private readCookie(name = 'csrftoken'): string | null {
    if (typeof document === 'undefined') {
      return null;
    }

    const escaped = name.replace(/[$()*+./?[\\\]^{|}-]/g, '\\$&');
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${escaped}=([^;]*)`),
    );

    return match ? decodeURIComponent(match[1]) : null;
  }
}
