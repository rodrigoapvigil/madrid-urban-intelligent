import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Decide Madrid: Invierte Y Compra, precios de vivienda por barrio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '58px 68px', color: '#F2F0EC', background: 'radial-gradient(ellipse at 80% 75%, #16304D 0%, #0E2238 45%, #0E2238 100%)', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: '#F2F0EC', fontSize: 24, letterSpacing: 2 }}>▥ <span>DECIDE MADRID: INVIERTE Y COMPRA</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 68, lineHeight: 1, fontWeight: 500 }}>El mercado de Madrid,</div>
        <div style={{ fontSize: 68, lineHeight: 1, color: '#F2F0EC', fontWeight: 500 }}>en perspectiva.</div>
        <div style={{ marginTop: 18, maxWidth: 850, fontSize: 26, lineHeight: 1.4, color: '#9FB2C6' }}>Precios de alquiler, compra y venta. Datos oficiales y tendencias por barrio.</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9FB2C6', fontSize: 18, letterSpacing: 2 }}><span>21 DISTRITOS</span><span>131 BARRIOS · MADRID</span></div>
    </div>, size,
  );
}
