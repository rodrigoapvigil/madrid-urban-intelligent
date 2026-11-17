import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

const profiles = [
  ['Alquiler', 'alquiler'],
  ['Compra', 'compra'],
  ['Venta', 'venta'],
  ['Inversión', 'inversion'],
] as const;

const viewports = [
  { name: 'escritorio 1440×900', width: 1440, height: 900, mobile: false },
  { name: 'móvil 390×844', width: 390, height: 844, mobile: true },
  { name: 'móvil horizontal 844×390', width: 844, height: 390, mobile: true },
] as const;

async function mockDashboardApi(page: Page) {
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
          ? { precio_m2: 21.62, precio_vivienda: 1958, variacion_mensual: 0.5, variacion_anual: 6.8, estado_mercado: 'Crecimiento (+)', esfuerzo_alquiler: 47, renta_media: 4134, is_prediction: false }
          : url.pathname.endsWith('/map')
            ? { districts: [], neighborhoods: [] }
            : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });
}

async function createContext(browser: Browser, width: number, height: number, mobile: boolean): Promise<BrowserContext> {
  return browser.newContext({
    baseURL: 'http://127.0.0.1:3100',
    viewport: { width, height },
    isMobile: mobile,
    hasTouch: mobile,
  });
}

async function readCtaStyle(page: Page) {
  const cta = page.locator('.mi-header__cta').first();
  await expect(cta).toHaveCount(1);
  return cta.evaluate(element => {
    const style = getComputedStyle(element);
    return { background: style.background, color: style.color, border: style.border };
  });
}

for (const viewport of viewports) {
  test(`Paridad · ${viewport.name} · perfiles, interruptores, CTA y overflow`, async ({ browser }) => {
    const context = await createContext(browser, viewport.width, viewport.height, viewport.mobile);
    const page = await context.newPage();
    await mockDashboardApi(page);
    await page.goto('/madrid', { waitUntil: 'domcontentloaded' });
    await page.locator('.v2-root').waitFor({ state: 'visible' });
    await page.locator('.dmiyc-ls').waitFor({ state: 'hidden', timeout: 30_000 });
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    const privacyNotice = page.getByRole('button', { name: 'Entendido' });
    if (await privacyNotice.isVisible().catch(() => false)) {
      await privacyNotice.click({ force: true });
      await page.locator('.privacy-notice').waitFor({ state: 'hidden', timeout: 3_000 }).catch(async () => {
        await page.addStyleTag({ content: '.privacy-notice { display: none !important; }' });
      });
    }

    const referenceCtaStyle = await readCtaStyle(page);
    const profileNav = viewport.mobile ? page.locator('.v2-mobile-profile-nav') : page.locator('.mi-nav--profiles');

    for (const [label, id] of profiles) {
      const tab = profileNav.getByRole('button', { name: label, exact: true });
      await tab.click();
      if (viewport.mobile) await expect(tab).toHaveAttribute('aria-pressed', 'true');
      else await expect(tab).toHaveClass(/active/);
      const dashboard = page.locator(`.v2-root[data-profile="${id}"]`);
      await expect(dashboard).toBeVisible();

      const selectors = await page.evaluate(() => {
        const statusDotCount = document.querySelectorAll('.v2-data-status-dot').length;
        const legacySwitchCount = document.querySelectorAll('.v2-mobile-map-switch, .v2-tabs-bg.small').length;
        const switchRoots = [
          ...document.querySelectorAll('.v2-mobile-map-control, .v2-mobile-segmented-control, .v2-mobile-compare-level-control, .v2-ranking-head-actions, .v2-compare-desktop-toolbar, .v2-connectivity-card'),
        ];
        const invalidSwitches = switchRoots.filter(root => {
          const optionButtons = [...root.querySelectorAll('button')].filter(button => button.hasAttribute('aria-pressed'));
          return optionButtons.length >= 2 && !root.querySelector('.segmented-control');
        }).length;
        return {
          statusDotCount,
          legacySwitchCount,
          invalidSwitches,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        };
      });

      expect(selectors.statusDotCount, `${label}: se eliminó el punto de estado del JSX`).toBe(0);
      expect(selectors.legacySwitchCount, `${label}: no quedan interruptores antiguos`).toBe(0);
      expect(selectors.invalidSwitches, `${label}: los interruptores de 2+ opciones usan SegmentedControl`).toBe(0);
      expect(selectors.scrollWidth, `${label}: no hay scroll horizontal`).toBeLessThanOrEqual(selectors.clientWidth);
      expect(await readCtaStyle(page), `${label}: CTA consistente dentro del dashboard`).toEqual(referenceCtaStyle);
    }

    expect(profileNav).toBeVisible();
    const dashboardCtaStyle = await readCtaStyle(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.mi-header__cta').first()).toBeAttached();
    const landingCtaStyle = await readCtaStyle(page);
    await page.goto('/contacto', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.mi-header__cta').first()).toBeAttached();
    const contactCtaStyle = await readCtaStyle(page);
    expect(landingCtaStyle, 'CTA de la landing tiene el mismo estilo computado').toEqual(dashboardCtaStyle);
    expect(contactCtaStyle, 'CTA de contacto tiene el mismo estilo computado').toEqual(dashboardCtaStyle);

    await context.close();
  });
}
