export const FORM_CONTROL_BASE =
  'rounded-md border bg-white text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60';

export const FORM_CONTROL_DEFAULT =
  'border-slate-300 focus:border-nbs-primary focus:ring-nbs-primary/30';

export const FORM_CONTROL_ERROR =
  'border-nbs-danger focus:border-nbs-danger focus:ring-nbs-danger/30';

export type FormControlHeight = 'sm' | 'md' | 'lg';

const HEIGHT_CLASSES: Record<FormControlHeight, string> = {
  sm: 'h-9',
  md: 'h-10',
  lg: 'h-12',
};

export function formControlClasses(options: {
  error?: boolean;
  height?: FormControlHeight;
  padding?: string;
  extra?: string;
}): string {
  const height = HEIGHT_CLASSES[options.height ?? 'md'];
  const state = options.error ? FORM_CONTROL_ERROR : FORM_CONTROL_DEFAULT;
  const padding = options.padding ?? 'px-3';
  const extra = options.extra ?? 'w-full';
  return [height, extra, FORM_CONTROL_BASE, padding, state]
    .filter(Boolean)
    .join(' ');
}

export const COMPACT_SEARCH_INPUT = formControlClasses({
  height: 'sm',
  padding: 'py-0 pl-8 pr-3',
  extra: 'w-full lg:w-56',
});
