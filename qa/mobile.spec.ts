import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshots = resolve(process.cwd(), 'qa/screenshots');

test.beforeAll(() => mkdirSync(screenshots, { recursive: true }));

async function mockDashboardApi(page: import('@playwright/test').Page) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const payload = url.pathname.endsWith('/filters')
      ? {
          years: ['2025', '2026'],
          months_by_year: {
            '2025': ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
            '2026': ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
          },
          latest_observed_period: { year: '2026', month: 'Junio' },
          districts: ['Arganzuela', 'Centro'],
        }
      : url.pathname.endsWith('/neighborhoods')
        ? ['Acacias', 'Palacio']
        : url.pathname.endsWith('/kpis')
          ? {
              precio_m2: url.searchParams.get('month') === 'Junio' ? 21.62 : 26.44,
              precio_vivienda: 1958,
              variacion_mensual: 0.5,
              variacion_anual: 6.8,
              estado_mercado: 'Crecimiento (+)',
              esfuerzo_alquiler: 47,
              renta_media: 4134,
              is_prediction: false,
            }
          : url.pathname.endsWith('/map')
            ? { districts: [], neighborhoods: [] }
            : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });
}

async function openReadyDashboard(page: import('@playwright/test').Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await mockDashboardApi(page);
  await page.goto('/madrid', { waitUntil: 'domcontentloaded' });
  await page.locator('.v2-root').waitFor({ state: 'visible' });
  await page.locator('.dmiyc-ls').waitFor({ state: 'hidden', timeout: 30_000 });
}

test('Paso 0 · guarda captura base de escritorio a 1440 × 900', async ({ page }) => {
  await openReadyDashboard(page, 1440, 900);
  await page.screenshot({ path: resolve(screenshots, 'paso-0-desktop-1440x900.png') });
});

test('Paso 0 · botón Filtros móvil visible en viewport y de al menos 44 px', async ({ page }) => {
  await openReadyDashboard(page, 390, 844);
  await page.screenshot({ path: resolve(screenshots, 'paso-0-mobile-390x844.png') });

  const filtersButton = page.locator('.v2-mobile-filter-trigger');
  const bounds = await filtersButton.boundingBox();
  console.log('Paso 0 · botón Filtros bounding box:', bounds);
  await expect(filtersButton).toBeVisible();
  await expect(filtersButton).toBeInViewport();
  expect(bounds?.height ?? 0).toBeGreaterThanOrEqual(44);
});
