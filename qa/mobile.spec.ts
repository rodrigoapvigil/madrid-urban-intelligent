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
  if (width <= 900 && await privacyNotice.isVisible().catch(() => false)) {
    await privacyNotice.click({ force: true });
    await page.locator('.privacy-notice').waitFor({ state: 'hidden', timeout: 3_000 }).catch(async () => {
      await page.addStyleTag({ content: '.privacy-notice { display: none !important; }' });
    });
  }
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
  await expect(page.locator('body')).toHaveCSS('overflow-y', 'hidden');
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

test('Paso 2 · aurora estática y navegación móvil permanecen bajo la cabecera', async ({ page }) => {
  await openReadyDashboard(page, 390, 844);
  await expect(page.locator('.v2-root')).toHaveAttribute('data-platform', 'mobile');
  await expect(page.locator('.bg-aurora--static')).toHaveCount(1);
  await expect(page.locator('.mi-header')).toHaveClass(/site-header--aurora/);
  const background = await page.locator('.bg-aurora--static').evaluate(element => ({
    position: getComputedStyle(element).position,
    pointerEvents: getComputedStyle(element).pointerEvents,
    animation: getComputedStyle(element.querySelector('.bg-aurora__blob')!).animationName,
    opacity: getComputedStyle(element.querySelector('.bg-aurora__blob--cyan')!).opacity,
  }));
  expect(background).toEqual({ position: 'fixed', pointerEvents: 'none', animation: 'none', opacity: '0.13' });
  const sectionNav = page.locator('.v2-mobile-section-nav');
  await expect(sectionNav).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(250);
  const headerTop = await page.locator('.mi-header').evaluate(element => element.getBoundingClientRect().top);
  const sectionTop = await sectionNav.evaluate(element => element.getBoundingClientRect().top);
  console.log('Paso 2 · top header / tabs tras scroll:', headerTop, sectionTop);
  expect(Math.abs(headerTop)).toBeLessThanOrEqual(1);
  expect(Math.abs(sectionTop - 68)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: resolve(screenshots, 'paso-2-mobile-sticky-390x844.png') });

  await openReadyDashboard(page, 1440, 900);
  await expect(page.locator('.v2-root')).toHaveAttribute('data-platform', 'desktop');
  await expect(page.locator('.bg-aurora--static')).toHaveCount(0);
  await expect(page.locator('.mi-header')).not.toHaveClass(/site-header--aurora/);
});

test('Paso 2 · móvil horizontal también usa el layout móvil', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await openReadyDashboard(page, 844, 390);
  await expect(page.locator('.v2-root')).toHaveAttribute('data-platform', 'mobile');
  await expect(page.locator('.mi-header__mobile-action .v2-mobile-filter-trigger')).toBeVisible();
  await expect(page.locator('.v2-mobile-profile-nav')).toBeVisible();
  console.log('Paso 2 · landscape header geometry:', await page.locator('.mi-header').evaluate(element => ({
    bounds: element.getBoundingClientRect().toJSON(), display: getComputedStyle(element).display,
    visibility: getComputedStyle(element).visibility, opacity: getComputedStyle(element).opacity,
    scrollY: window.scrollY, brand: element.querySelector('.mi-brand')?.getBoundingClientRect().toJSON(),
    text: element.textContent, brandColor: getComputedStyle(element.querySelector('.mi-brand')!).color,
    action: getComputedStyle(element.querySelector('.mi-header__mobile-action')!).display,
    logo: element.querySelector('img')?.getBoundingClientRect().toJSON(),
  })));
  await expect(page.locator('.v2-mobile-section-nav button').first()).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.screenshot({ path: resolve(screenshots, 'paso-2-mobile-landscape-844x390.png') });
  await context.close();
});

test('Paso 3 · los selectores del dashboard usan SegmentedControl en los cuatro perfiles', async ({ page }) => {
  await openReadyDashboard(page, 390, 844);
  const profileNav = page.getByRole('navigation', { name: 'Perfiles de mercado' }).last();
  for (const [profile, id] of [['Alquiler', 'alquiler'], ['Compra', 'compra'], ['Venta', 'venta'], ['Inversión', 'inversion']]) {
    await profileNav.getByRole('button', { name: profile, exact: true }).click();
    const panel = page.locator(`.v2-root[data-profile="${id}"] .v2-panel.v2-active`);
    await expect(panel).toBeVisible();

    const zones = panel.locator('.v2-mobile-segmented-control .segmented-control');
    await expect(zones).toBeVisible();
    for (let index = 0; index < await zones.locator('button').count(); index++) {
      const bounds = await zones.locator('button').nth(index).boundingBox();
      expect(bounds?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    await zones.getByRole('button', { name: 'Barrios', exact: true }).click();
    await expect(zones.getByRole('button', { name: 'Barrios', exact: true })).toHaveAttribute('aria-pressed', 'true');

    const comparison = panel.locator('.v2-mobile-compare-level-control .segmented-control');
    await comparison.scrollIntoViewIfNeeded();
    await expect(comparison).toBeVisible();
    for (let index = 0; index < await comparison.locator('button').count(); index++) {
      const bounds = await comparison.locator('button').nth(index).boundingBox();
      expect(bounds?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    await comparison.getByRole('button', { name: 'Barrios', exact: true }).click();
    await expect(comparison.getByRole('button', { name: 'Barrios', exact: true })).toHaveAttribute('aria-pressed', 'true');

    const unit = panel.locator('.v2-ranking-head-actions .segmented-control');
    if (['alquiler', 'compra'].includes(id)) {
      await expect(unit).toBeVisible();
      const buttons = unit.locator('button');
      for (let index = 0; index < await buttons.count(); index++) {
        const bounds = await buttons.nth(index).boundingBox();
        expect(bounds?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
      await unit.getByRole('button', { name: '€/m²', exact: true }).click();
      await expect(unit.getByRole('button', { name: '€/m²', exact: true })).toHaveAttribute('aria-pressed', 'true');
    } else {
      await expect(unit).toHaveCount(0);
    }
  }
  await page.screenshot({ path: resolve(screenshots, 'paso-3-mobile-segmented-390x844.png') });

  await openReadyDashboard(page, 1440, 900);
  await expect(page.locator('.v2-mobile-compare-level-control')).toHaveCount(0);
  await expect(page.locator('.v2-mobile-segmented-control')).toHaveCount(0);
});

test('Paso 4 · los precios de alquiler destacan sin recortar sus unidades en móvil', async ({ page }) => {
  for (const width of [360, 390]) {
    await openReadyDashboard(page, width, 844);
    const price = page.locator('.v2-panel.v2-active .v2-rent-main-value strong');
    const rent = page.locator('.v2-panel.v2-active .v2-rent-secondary-card:not(.v2-rent-effort) > strong');
    await expect(price).toBeVisible();
    await expect(rent).toBeVisible();
    const sizes = await page.evaluate(() => {
      const priceValue = document.querySelector('.v2-panel.v2-active .v2-rent-main-value strong')!;
      const priceUnit = document.querySelector('.v2-panel.v2-active .v2-rent-main-value span')!;
      const rentValue = document.querySelector('.v2-panel.v2-active .v2-rent-secondary-card:not(.v2-rent-effort) > strong')!;
      const rentUnit = rentValue.querySelector('small')!;
      return {
        price: parseFloat(getComputedStyle(priceValue).fontSize),
        priceUnit: parseFloat(getComputedStyle(priceUnit).fontSize),
        rent: parseFloat(getComputedStyle(rentValue).fontSize),
        rentUnit: parseFloat(getComputedStyle(rentUnit).fontSize),
        overflow: document.documentElement.scrollWidth > innerWidth,
        priceBounds: priceValue.getBoundingClientRect().toJSON(),
        priceUnitBounds: priceUnit.getBoundingClientRect().toJSON(),
        rentBounds: rentValue.getBoundingClientRect().toJSON(),
        rentUnitBounds: rentUnit.getBoundingClientRect().toJSON(),
      };
    });
    console.log(`Paso 4 · ${width}px price/unit measurements:`, sizes);
    expect(sizes.price).toBeGreaterThanOrEqual(1.2 * Math.min(44, width * .13));
    expect(sizes.rent).toBeGreaterThanOrEqual(1.35 * Math.min(28, width * .07));
    expect(sizes.priceUnit).toBeLessThan(sizes.price);
    expect(sizes.rentUnit).toBeLessThan(sizes.rent);
    expect(sizes.overflow).toBe(false);
    if (width === 390) await page.screenshot({ path: resolve(screenshots, 'paso-4-mobile-prices-390x844.png') });
  }
});

test('Paso 5 · regresión responsive de perfiles, móvil horizontal y escritorio', async ({ browser, page }) => {
  const profiles = [
    ['Alquiler', 'alquiler'],
    ['Compra', 'compra'],
    ['Venta', 'venta'],
    ['Inversión', 'inversion'],
  ] as const;

  for (const [width, height] of [[390, 844], [360, 740]] as const) {
    await openReadyDashboard(page, width, height);
    await expect(page.locator('.v2-root')).toHaveAttribute('data-platform', 'mobile');
    await expect(page.locator('.mi-header__mobile-action .v2-mobile-filter-trigger')).toBeVisible();
    await expect(page.locator('.v2-mobile-section-nav')).toBeVisible();
    await expect(page.locator('.v2-mobile-profile-nav').last()).toBeVisible();
    for (const [label, id] of profiles) {
      const tab = page.getByRole('navigation', { name: 'Perfiles de mercado' }).last().getByRole('button', { name: label, exact: true });
      await tab.click();
      await expect(page.locator(`.v2-root[data-profile="${id}"] .v2-panel.v2-active`)).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      expect(overflow, `${width}x${height} ${label} horizontal overflow`).toBe(false);
    }
  }

  const landscape = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const landscapePage = await landscape.newPage();
  await openReadyDashboard(landscapePage, 844, 390);
  await expect(landscapePage.locator('.v2-root')).toHaveAttribute('data-platform', 'mobile');
  await expect(landscapePage.locator('.mi-header__mobile-action .v2-mobile-filter-trigger')).toBeVisible();
  await expect(landscapePage.locator('.v2-mobile-section-nav')).toBeVisible();
  const landscapeNav = landscapePage.getByRole('navigation', { name: 'Perfiles de mercado' }).last();
  for (const [label, id] of profiles) {
    await landscapeNav.getByRole('button', { name: label, exact: true }).click();
    await expect(landscapePage.locator(`.v2-root[data-profile="${id}"] .v2-panel.v2-active`)).toBeVisible();
  }
  const landscapeOverflow = await landscapePage.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(landscapeOverflow, '844x390 horizontal overflow').toBe(false);
  await landscapePage.screenshot({ path: resolve(screenshots, 'paso-5-mobile-landscape-844x390.png') });
  await landscape.close();

  for (const width of [1440, 1920]) {
    await openReadyDashboard(page, width, 900);
    await expect(page.locator('.v2-root')).toHaveAttribute('data-platform', 'desktop');
    await expect(page.locator('.v2-mobile-section-nav')).toHaveCount(0);
    await expect(page.locator('.v2-mobile-profile-nav')).toHaveCount(0);
    await expect(page.locator('.v2-mobile-filter-trigger')).toHaveCount(0);
    await expect(page.locator('.v2-mobile-filter-bar, .v2-mobile-filter-heading, .v2-mobile-filter-commit')).toHaveCount(0);
    await expect(page.locator('.v2-mobile-compare-level-control')).toHaveCount(0);
    await page.screenshot({ path: resolve(screenshots, `paso-5-desktop-${width}x900.png`) });
  }
});
