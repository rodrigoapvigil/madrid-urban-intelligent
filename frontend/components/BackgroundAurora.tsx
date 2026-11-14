import './BackgroundAurora.css';

export default function BackgroundAurora() {
  return (
    <div className="bg-aurora" aria-hidden="true">
      <i className="bg-aurora__blob bg-aurora__blob--cyan" />
      <i className="bg-aurora__blob bg-aurora__blob--blue" />
      <i className="bg-aurora__blob bg-aurora__blob--violet" />
    </div>
  );
}
