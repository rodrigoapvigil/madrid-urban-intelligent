import type { MetadataRoute } from 'next';
import territories from '../lib/madrid-seo-territories.json';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: 'https://dmiyc.com/', changeFrequency: 'weekly', priority: 1 },
    { url: 'https://dmiyc.com/madrid', changeFrequency: 'weekly', priority: 0.9 },
    { url: 'https://dmiyc.com/madrid/barrios', changeFrequency: 'weekly', priority: 0.85 },
    { url: 'https://dmiyc.com/madrid/veredicto', changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://dmiyc.com/metodologia', changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://dmiyc.com/sobre-el-proyecto', changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://dmiyc.com/madrid/chat', changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://dmiyc.com/contacto', changeFrequency: 'yearly', priority: 0.3 },
  ];

  const distritoRoutes: MetadataRoute.Sitemap = territories.distritos.map((d) => ({
    url: `https://dmiyc.com/madrid/distrito/${d.slug}`,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  const barrioRoutes: MetadataRoute.Sitemap = territories.barrios.map((b) => ({
    url: `https://dmiyc.com/madrid/barrio/${b.slug}`,
    changeFrequency: 'monthly',
    priority: 0.75,
  }));

  return [...staticRoutes, ...distritoRoutes, ...barrioRoutes];
}
