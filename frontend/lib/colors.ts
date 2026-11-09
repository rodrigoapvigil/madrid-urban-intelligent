function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3 ? normalized.split('').map((part) => part + part).join('') : normalized;
  const channels = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${alpha})`;
}

export function resolveCssColor(input: string): string {
  if (typeof document === 'undefined') return input;
  const mix = input.match(/^color-mix\(in srgb,\s*(var\(--[\w-]+\))\s+(\d+(?:\.\d+)?)%\s*,\s*transparent\)$/i);
  if (mix) {
    const color = resolveCssColor(mix[1]);
    return hexToRgba(color, Number(mix[2]) / 100);
  }
  const variable = input.match(/^var\((--[\w-]+)(?:,\s*(.+))?\)$/);
  if (variable) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable[1]).trim()
      || variable[2]
      || '';
    return value ? resolveCssColor(value) : input;
  }
  return input;
}

export function colorWithAlpha(input: string, alpha: number): string {
  const color = resolveCssColor(input);
  if (/^#[\da-f]{6}$/i.test(color)) return hexToRgba(color, alpha);
  if (/^#[\da-f]{3}$/i.test(color)) return hexToRgba(color, alpha);
  const rgb = color.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
  return color;
}

const resolvedCallbacks = new WeakMap<Function, Function>();

function resolveChartValue(value: unknown): unknown {
  if (typeof value === 'string' && (value.startsWith('var(') || value.startsWith('color-mix('))) return resolveCssColor(value);
  if (Array.isArray(value)) return value.map(resolveChartValue);
  if (typeof value === 'function') {
    const original = value as (...args: unknown[]) => unknown;
    const cached = resolvedCallbacks.get(original);
    if (cached) return cached;
    const wrapped = (...args: unknown[]) => {
      try {
        const res = original(...args);
        return typeof res === 'string' ? resolveChartValue(res) : res;
      } catch (err) {
        return 'rgba(0, 240, 255, 0.18)';
      }
    };
    resolvedCallbacks.set(original, wrapped);
    return wrapped;
  }
  return value;
}

export const cssColorResolverPlugin = {
  id: 'cssColorResolver',
  beforeUpdate(chart: {
    data: { datasets: Record<string, unknown>[] };
    config?: { options?: Record<string, unknown> };
  }) {
    // Only touch the raw color fields. Walking chart.options recursively causes
    // Chart.js to execute unrelated scriptable callbacks (for example datalabels
    // align/anchor) with an incomplete context before the chart exists.
    const resolveFields = (target: unknown, fields: string[]) => {
      if (!target || typeof target !== 'object') return;
      const record = target as Record<string, unknown>;
      fields.forEach((field) => {
        if (field in record) record[field] = resolveChartValue(record[field]);
      });
    };

    const colorFields = [
      'backgroundColor', 'borderColor', 'pointBackgroundColor',
      'pointBorderColor', 'color', 'titleColor', 'bodyColor',
    ];
    chart.data.datasets.forEach((dataset) => resolveFields(dataset, colorFields));

    const options = chart.config?.options;
    if (!options) return;
    resolveFields(options, colorFields);
    const plugins = options.plugins as Record<string, unknown> | undefined;
    resolveFields(plugins?.tooltip, colorFields);
    resolveFields(plugins?.legend, colorFields);
    const legend = plugins?.legend as Record<string, unknown> | undefined;
    resolveFields(legend?.labels, colorFields);
    resolveFields(plugins?.datalabels, colorFields);
  },
};
