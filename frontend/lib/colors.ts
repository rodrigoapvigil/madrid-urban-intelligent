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
    const wrapped = (...args: unknown[]) => resolveChartValue(original(...args));
    resolvedCallbacks.set(original, wrapped);
    return wrapped;
  }
  return value;
}

export const cssColorResolverPlugin = {
  id: 'cssColorResolver',
  beforeUpdate(chart: { data: { datasets: Record<string, unknown>[] }; options: Record<string, unknown> }) {
    const seen = new WeakSet<object>();
    const visit = (target: unknown) => {
      if (!target || typeof target !== 'object' || seen.has(target as object)) return;
      seen.add(target as object);
      if (Array.isArray(target)) { target.forEach(visit); return; }
      for (const [key, value] of Object.entries(target as Record<string, unknown>)) {
        if (/color$/i.test(key) || /colou?r$/i.test(key)) {
          (target as Record<string, unknown>)[key] = resolveChartValue(value);
        } else visit(value);
      }
    };
    chart.data.datasets.forEach(visit);
    visit(chart.options);
  },
};
