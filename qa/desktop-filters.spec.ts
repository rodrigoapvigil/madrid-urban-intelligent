import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshots = resolve(process.cwd(), 'qa/screenshots');

test('Paso 1 · la cabecera de escritorio conserva solo los dos filtros de periodo al hacer scroll', async ({ page }) => {
  mkdirSync(screenshots, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const payload = url.pathname.endsWith('/filters')
      ? {
          years: ['2025', '2026'],
          months_by_year: { '2025': ['Enero', 'Junio', 'Noviembre', 'Diciembre'], '2026': ['Enero', 'Junio', 'Noviembre', 'Diciembre'] },
          latest_observed_period: { year: '2026', month: 'Junio' },
          districts: ['Arganzuela', 'Barajas', 'Centro'],
        }
      : url.pathname.endsWith('/neighborhoods')
        ? ['Acacias', 'Palacio']
        : url.pathname.endsWith('/kpis')
          ? { precio_m2: 21.62, precio_vivienda: 1958, variacion_mensual: 0.5, variacion_anual: 6.8, estado_mercado: 'Crecimiento (+)', esfuerzo_alquiler: 47, renta_media: 4134, is_prediction: false }
          : url.pathname.endsWith('/map')
            ? { districts: [], neighborhoods: [] }
            : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });

  await page.goto('/madrid', { waitUntil: 'domcontentloaded' });
  await page.locator('.v2-root[data-platform="desktop"]').waitFor({ state: 'visible' });
  await page.locator('.dmiyc-ls').waitFor({ state: 'hidden', timeout: 30_000 });
  const headerFilters = page.locator('#v2-filter-panel');
  const periodLabel = headerFilters.getByText('Periodo', { exact: true });
  const selects = headerFilters.locator('.v2-custom-select');

  await expect(periodLabel).toBeVisible();
  await expect(selects).toHaveCount(2);
  await expect(headerFilters.getByText('Año', { exact: true })).toBeVisible();
  await expect(headerFilters.getByText('Mes', { exact: true })).toBeVisible();
  await expect(headerFilters.locator('.v2-zone-filter-row')).toHaveCount(0);
  console.log('Paso 1 · cabecera antes de scroll:', await headerFilters.evaluate(element => ({
    bounds: element.getBoundingClientRect().toJSON(),
    position: getComputedStyle(element).position,
    top: getComputedStyle(element).top,
    dropdownCount: element.querySelectorAll('.v2-custom-select').length,
  })));
  await page.screenshot({ path: resolve(screenshots, 'paso-1-desktop-header-1440x900.png') });

  await page.locator('.v2-panel.v2-active .v2-compare-section').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await expect(selects).toHaveCount(2);
  await expect(periodLabel).toBeVisible();
  const afterScroll = await headerFilters.evaluate(element => ({
    bounds: element.getBoundingClientRect().toJSON(),
    scrollY: window.scrollY,
    dropdownCount: element.querySelectorAll('.v2-custom-select').length,
  }));
  console.log('Paso 1 · cabecera sobre Comparar zonas:', afterScroll);
  expect(afterScroll.scrollY).toBeGreaterThan(0);
  expect(afterScroll.bounds.top).toBeGreaterThanOrEqual(87);
  expect(afterScroll.bounds.top).toBeLessThanOrEqual(89);
  await page.screenshot({ path: resolve(screenshots, 'paso-1-desktop-compare-1440x900.png') });
});
