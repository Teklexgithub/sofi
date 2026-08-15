// Color tokens for the analytics dashboard charts.
// Values come from the validated reference palette (dataviz skill): the
// categorical order is fixed (never cycled/reordered) and the sequential/status
// colors are used as documented. Run scripts/validate_palette.js again before
// changing any of these hex values.

export interface ChartTheme {
  surface: string;
  pagePlane: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  gridline: string;
  axisLine: string;
  /** Single-hue accent for one-series magnitude/trend charts. */
  sequential: string;
  /** Fixed-order categorical slots for multi-series charts (2-3 series recommended). */
  categorical: string[];
  /** Fixed status colors - never reused for a generic series, always icon + label. */
  status: {
    good: string;
    warning: string;
    serious: string;
    critical: string;
  };
}

const CATEGORICAL_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const CATEGORICAL_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

export const getChartTheme = (isDark: boolean): ChartTheme => ({
  surface: isDark ? '#1a1a19' : '#fcfcfb',
  pagePlane: isDark ? '#0d0d0d' : '#f9f9f7',
  border: isDark ? '#2c2c2a' : '#e1e0d9',
  textPrimary: isDark ? '#ffffff' : '#0b0b0b',
  textSecondary: isDark ? '#c3c2b7' : '#52514e',
  textMuted: '#898781',
  gridline: isDark ? '#2c2c2a' : '#e1e0d9',
  axisLine: isDark ? '#383835' : '#c3c2b7',
  sequential: isDark ? '#3987e5' : '#2a78d6',
  categorical: isDark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT,
  status: {
    good: '#0ca30c',
    warning: '#fab219',
    serious: '#ec835a',
    critical: '#d03b3b',
  },
});

/** Format an ETB amount for compact axis/label display, e.g. 12500 -> "12.5k ETB". */
export const formatETB = (value: number, compact = false): string => {
  const n = Number(value || 0);
  if (compact && Math.abs(n) >= 1000) {
    return `${(n / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k ETB`;
  }
  return `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
};
