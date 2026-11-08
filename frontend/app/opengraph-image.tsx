import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Decide Madrid: Invierte Y Compra, precios de vivienda por barrio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '58px 68px',
        color: '#F4EDE0',
        background: 'radial-gradient(ellipse at 80% 75%, #1A2B4E 0%, #14213D 55%, #0B1323 100%)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          color: '#FF6B5B',
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: 2,
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            backgroundColor: '#FF6B5B',
          }}
        />
        <span>DECIDE MADRID: INVIERTE Y COMPRA (DMIYC)</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 64, lineHeight: 1.05, fontWeight: 700, color: '#F4EDE0' }}>
          El mercado de Madrid,
        </div>
        <div style={{ fontSize: 64, lineHeight: 1.05, fontWeight: 700, color: '#FF6B5B' }}>
          con datos reales sin sesgo.
        </div>
        <div
          style={{
            marginTop: 16,
            maxWidth: 900,
            fontSize: 24,
            lineHeight: 1.4,
            color: 'rgba(244, 237, 224, 0.75)',
          }}
        >
          Compra o alquila con precios de cierre oficial en los 131 barrios de Madrid. Sin caer en ofertas infladas.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 24,
          borderTop: '1px solid rgba(244, 237, 224, 0.15)',
          color: 'rgba(244, 237, 224, 0.75)',
          fontSize: 16,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        <span>21 DISTRITOS AUDITADOS</span>
        <span style={{ color: '#FF6B5B' }}>16.779 OPERACIONES CONSOLIDADAS</span>
        <span>131 BARRIOS · MADRID</span>
      </div>
    </div>,
    size,
  );
}
