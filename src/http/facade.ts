import { lockManager, LockManager } from './lock';

type HttpMethod = 'GET' | 'POST' | 'DELETE';

export class ApiFacade {
  private lock: LockManager;

  constructor(lock: LockManager = lockManager) {
    this.lock = lock;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const port = this.lock.getServerPort();

      if (!port) {
        return false;
      }

      const response = await fetch(`http://localhost:${port}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private getBaseUrl(): string {
    const port = this.lock.getServerPort();

    if (!port) {
      throw new Error(
        'Reagent server is not running. Start it with "reagent start"'
      );
    }

    return `http://localhost:${port}/api`;
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.getBaseUrl()}${path}`;
    const response = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => undefined);
      const message = (errorBody as { error?: string } | undefined)?.error || response.statusText;
      throw new Error(`API error (${response.status}): ${message}`);
    }

    return response.json() as Promise<T>;
  }
}

export function createApiFacade(lock: LockManager = lockManager): ApiFacade {
  return new ApiFacade(lock);
}

export const apiFacade = new ApiFacade();
