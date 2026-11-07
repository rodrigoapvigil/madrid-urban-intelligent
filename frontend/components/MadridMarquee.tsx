'use client';

const SOURCES = [
  { name: 'Ayuntamiento de Madrid', label: 'Datos Abiertos Municipales' },
  { name: 'Dirección General del Catastro', label: 'Superficie y Valoración Inmobiliaria' },
  { name: 'Colegio de Registradores', label: 'Estadística Registral Inmobiliaria' },
  { name: 'Instituto Nacional de Estadística', label: 'Censo y Padrón Oficial (INE)' },
  { name: 'EMVS Madrid', label: 'Empresa Municipal de la Vivienda y Suelo' },
  { name: 'Banco de España', label: 'Indicadores de Esfuerzo Financiero' },
  { name: 'Consejo General del Notariado', label: 'Precios de Cierre Escriturados' },
];

export default function MadridMarquee() {
  return (
    <section className="mi-marquee-section" aria-label="Fuentes oficiales y datos públicos verificados">
      <div className="mi-wrap">
        <p className="mi-marquee-label">Fuentes oficiales auditadas · Rigor público sin intermediarios</p>
      </div>
      <div className="mi-marquee-track-wrap" aria-hidden="true">
        <div className="mi-marquee-track">
          {/* First loop */}
          {SOURCES.map((source, index) => (
            <div className="mi-marquee-item" key={`src-a-${index}`}>
              <span className="mi-marquee-dot" />
              <strong className="mi-marquee-name">{source.name}</strong>
              <span className="mi-marquee-detail">{source.label}</span>
            </div>
          ))}
          {/* Second loop for seamless infinite marquee */}
          {SOURCES.map((source, index) => (
            <div className="mi-marquee-item" key={`src-b-${index}`}>
              <span className="mi-marquee-dot" />
              <strong className="mi-marquee-name">{source.name}</strong>
              <span className="mi-marquee-detail">{source.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
