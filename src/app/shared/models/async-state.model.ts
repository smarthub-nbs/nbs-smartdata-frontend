export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

export function idleState<T>(): AsyncState<T> {
  return { status: 'idle' };
}

export function loadingState<T>(): AsyncState<T> {
  return { status: 'loading' };
}

export function successState<T>(data: T): AsyncState<T> {
  return { status: 'success', data };
}

export function errorState<T>(message: string): AsyncState<T> {
  return { status: 'error', message };
}
