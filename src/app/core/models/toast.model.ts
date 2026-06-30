export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  handler: () => void;
}

export interface ToastOptions {
  title?: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
  persistent?: boolean;
  action?: ToastAction;
}

export interface Toast {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
  dismissing: boolean;
  /** Auto-dismiss duration in ms; 0 means the toast never auto-dismisses. */
  durationMs: number;
}
