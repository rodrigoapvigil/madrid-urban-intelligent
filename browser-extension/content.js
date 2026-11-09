(function () {
  'use strict';

  // Solo lee el DOM de la página que el usuario ya ha abierto. No evade antibots.
  const TARGET_APP = 'https://dmiyc.com/madrid/veredicto';
  const BARRIOS = ['Comillas', 'Carabanchel', 'Centro', 'Salamanca', 'Chamberí', 'Chamberi', 'Retiro', 'Argüelles', 'Arguelles', 'Latina', 'Usera', 'Villaverde', 'Tetuán', 'Tetuan', 'Chamartín', 'Chamartin', 'Fuencarral', 'Hortaleza', 'Barajas', 'Moratalaz', 'Vicálvaro', 'Vicalvaro', 'San Blas', 'Ciudad Lineal', 'Puente de Vallecas', 'Villa de Vallecas'];

  function pageText() { return document.body ? document.body.innerText.slice(0, 250000) : ''; }
  function firstMatch(patterns, text) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1] || match[0];
    }
    return null;
  }
  function readJsonLd() {
    const result = {};
    document.querySelectorAll('script[type="application/ld+json"]').forEach((node) => {
      try {
        const data = JSON.parse(node.textContent || '');
        const items = Array.isArray(data) ? data : [data, ...(data && Array.isArray(data['@graph']) ? data['@graph'] : [])];
        items.forEach((item) => {
          if (!item || typeof item !== 'object') return;
          const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          if (!result.price && offers && offers.price) result.price = Number(String(offers.price).replace(/\./g, '').replace(',', '.'));
          if (!result.area && item.floorSize && item.floorSize.value) result.area = Number(String(item.floorSize.value).replace(',', '.'));
          if (!result.location && item.address) result.location = [item.address.streetAddress, item.address.addressLocality, item.address.addressRegion].filter(Boolean).join(', ');
        });
      } catch (_) { /* Se usa el texto visible como respaldo. */ }
    });
    return result;
  }
  function extractListing() {
    const text = pageText();
    const jsonLd = readJsonLd();
    const title = document.querySelector('h1')?.textContent?.trim() || document.querySelector('meta[property="og:title"]')?.content || document.title;
    const description = document.querySelector('meta[property="og:description"]')?.content || '';
    const source = `${title} ${description} ${jsonLd.location || ''} ${text}`;
    const priceText = firstMatch([/(\d{1,3}(?:\.\d{3})+|\d+)\s*€/, /€\s*(\d{1,3}(?:\.\d{3})+|\d+)/], source);
    const areaText = firstMatch([/(\d+(?:[.,]\d+)?)\s*m[²2]/i, /(\d+(?:[.,]\d+)?)\s*metros cuadrados/i], source);
    const price = jsonLd.price || (priceText ? Number(priceText.replace(/\./g, '').replace(',', '.')) : null);
    const area = jsonLd.area || (areaText ? Number(areaText.replace(',', '.')) : null);
    const operation = /\balquiler\b|\barrendamiento\b/i.test(source) ? 'Alquiler' : 'Venta';
    const location = jsonLd.location || source;
    const barrio = BARRIOS.find((item) => location.toLocaleLowerCase().includes(item.toLocaleLowerCase())) || null;
    return { url: window.location.href, titulo: title?.slice(0, 180) || null, precio: Number.isFinite(price) ? price : null, metros: Number.isFinite(area) ? area : null, operacion: operation, barrio, ubicacion: location.slice(0, 1000) };
  }
  function showButton() {
    if (document.getElementById('dmiyc-import-button')) return;
    const button = document.createElement('button');
    button.id = 'dmiyc-import-button';
    button.type = 'button';
    button.textContent = 'Importar en DMIYC';
    Object.assign(button.style, { position: 'fixed', right: '20px', bottom: '20px', zIndex: '2147483647', border: '1px solid #00f0ff', borderRadius: '999px', padding: '12px 18px', background: '#061a31', color: '#f4f8fb', font: '600 14px system-ui', boxShadow: '0 8px 28px rgba(0,240,255,.28)', cursor: 'pointer' });
    button.addEventListener('click', () => {
      const params = new URLSearchParams({ dmiyc_import: JSON.stringify(extractListing()) });
      window.open(`${TARGET_APP}?${params.toString()}`, '_blank', 'noopener');
    });
    document.documentElement.appendChild(button);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showButton, { once: true });
  else showButton();
})();
