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
  // Next dev overlays its error counter over the bottom navigation when the mocked
  // map API omits production geometry. Keep the visual test focused on page UI.
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  const privacyNotice = page.getByRole('button', { name: 'Entendido' });
  if (width <= 768 && await privacyNotice.isVisible().catch(() => false)) await privacyNotice.click();
}

test('Paso 0 · guarda captura base de escritorio a 1440 × 900', async ({ page }) => {
  await openReadyDashboard(page, 1440, 900);
  await page.screenshot({ path: resolve(screenshots, 'validacion-paso-0-desktop-1440x900.png') });
});

test('Paso 0 · botón Filtros móvil visible en viewport y de al menos 44 px', async ({ page }) => {
  await openReadyDashboard(page, 390, 844);
  await page.screenshot({ path: resolve(screenshots, 'validacion-paso-0-mobile-390x844.png') });

  const filtersButton = page.locator('.v2-mobile-filter-trigger');
  const bounds = await filtersButton.boundingBox();
  console.log('Paso 0 · botón Filtros bounding box:', bounds);
  await expect(filtersButton).toBeVisible();
  await expect(filtersButton).toBeInViewport();
  expect(bounds?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test('Paso 1 · filtros, perfiles y chips funcionan en móvil', async ({ page }) => {
  await openReadyDashboard(page, 390, 844);
  const filtersButton = page.locator('.mi-header__mobile-action .v2-mobile-filter-trigger');
  const profileNav = page.getByRole('navigation', { name: 'Perfiles de mercado' }).last();
  await expect(filtersButton).toBeVisible();
  await expect(profileNav).toBeVisible();
  for (const profile of ['Alquiler', 'Compra', 'Venta', 'Inversión']) {
    const tab = profileNav.getByRole('button', { name: profile });
    await expect(tab).toBeVisible();
    await tab.click();
    await expect(tab).toHaveAttribute('aria-pressed', 'true');
  }
  await profileNav.getByRole('button', { name: 'Alquiler' }).click();

  await filtersButton.click();
  const panel = page.locator('#v2-filter-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('role', 'dialog');
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await expect(profileNav).toBeHidden();
  await page.screenshot({ path: resolve(screenshots, 'paso-1-filtros-390x844.png') });

  await panel.locator('.v2-dropdown-container').nth(0).locator('.v2-custom-select').click();
  await page.getByRole('option', { name: '2025', exact: true }).click();
  await panel.locator('.v2-dropdown-container').nth(1).locator('.v2-custom-select').click();
  await page.getByRole('option', { name: 'Junio', exact: true }).click();
  await panel.locator('.v2-dropdown-container').nth(2).locator('.v2-custom-select').click();
  await page.getByRole('option', { name: 'Arganzuela', exact: true }).click();
  await expect(panel.locator('.v2-dropdown-container').nth(3).locator('.v2-custom-select')).toBeEnabled();
  await expect(panel.getByRole('button', { name: 'Aplicar (2)' })).toBeVisible();
  await panel.getByRole('button', { name: 'Aplicar (2)' }).click();
  await expect(filtersButton).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.v2-mobile-filter-summary')).toContainText('Arganzuela · Junio 2025');
  await expect(page.locator('.v2-panel.v2-active .v2-rent-main-value strong')).toHaveText('21,62');
  await expect(page.locator('.v2-mobile-filter-chips button')).toHaveCount(2);

  await page.screenshot({ path: resolve(screenshots, 'paso-1-mobile-390x844.png'), fullPage: false });
  await filtersButton.click();
  await panel.getByRole('button', { name: 'Restablecer al último dato real' }).click();
  await expect(page.locator('.v2-mobile-filter-summary')).toContainText('Madrid · Junio 2026');
  await expect(filtersButton.locator('b')).toHaveText('0');
  await expect(page.locator('.v2-panel.v2-active .v2-rent-main-value strong')).toHaveText('21,62');
});

test('Paso 1 · cerrar con Escape y Atrás; móvil estrecho y escritorio sin acción de filtros', async ({ page }) => {
  await openReadyDashboard(page, 360, 740);
  await page.screenshot({ path: resolve(screenshots, 'paso-1-mobile-360x740.png') });
  const trigger = page.locator('.mi-header__mobile-action .v2-mobile-filter-trigger');
  await expect(trigger).toBeVisible();
  await expect(trigger).toBeInViewport();
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#v2-filter-panel')).toBeHidden();
  await trigger.click();
  await page.goBack();
  await expect(page.locator('#v2-filter-panel')).toBeHidden();

  await openReadyDashboard(page, 1440, 900);
  await page.screenshot({ path: resolve(screenshots, 'paso-1-desktop-1440x900.png') });
  await expect(page.locator('.mi-header__mobile-action')).toHaveCount(0);
  await expect(page.locator('.v2-mobile-filter-bar')).toBeHidden();
});
