import type { ChartOptions } from 'chart.js';

export const CHART_COLORS = {
  primary: '#0272a7',
  primarySoft: 'rgba(2, 114, 167, 0.15)',
  accent: '#219f94',
  highlight: '#edc91e',
  muted: '#475569',
  border: '#e2e8f0',
  series: ['#0272a7', '#219f94', '#edc91e', '#3399ca', '#02618e'] as const,
} as const;

export function chartTooltipOptions(): NonNullable<
  ChartOptions['plugins']
>['tooltip'] {
  return {
    backgroundColor: '#0a1f3d',
    titleColor: '#ffffff',
    bodyColor: '#e2e8f0',
    borderColor: CHART_COLORS.border,
    borderWidth: 1,
    padding: 10,
  };
}

export function chartLegendOptions(): NonNullable<
  ChartOptions['plugins']
>['legend'] {
  return {
    labels: {
      color: CHART_COLORS.muted,
      boxWidth: 12,
      padding: 16,
    },
  };
}

export function chartAxisTicksColor(): string {
  return CHART_COLORS.muted;
}

export function chartGridColor(): string {
  return CHART_COLORS.border;
}
