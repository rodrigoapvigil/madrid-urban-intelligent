import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Madrid Urban Intelligence: precios de vivienda y evolución del mercado por barrio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '58px 68px', color: '#f7fffe', background: 'radial-gradient(ellipse at 80% 75%, #07534f 0%, #012624 45%, #011d1c 100%)', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: '#cbfffc', fontSize: 24, letterSpacing: 2 }}>▥ <span>MADRID URBAN INTELLIGENCE</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 68, lineHeight: 1, fontWeight: 500 }}>El mercado de Madrid,</div>
        <div style={{ fontSize: 68, lineHeight: 1, color: '#cbfffc', fontWeight: 500 }}>en perspectiva.</div>
        <div style={{ marginTop: 18, maxWidth: 850, fontSize: 26, lineHeight: 1.4, color: '#bbc7c6' }}>Precios de alquiler, compra y venta. Datos oficiales y tendencias por barrio.</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#bbc7c6', fontSize: 18, letterSpacing: 2 }}><span>21 DISTRITOS</span><span>131 BARRIOS · MADRID</span></div>
    </div>, size,
  );
}
