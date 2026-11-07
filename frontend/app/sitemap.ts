import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://dmiyc.com/', changeFrequency: 'weekly', priority: 1 },
    { url: 'https://dmiyc.com/madrid', changeFrequency: 'weekly', priority: 0.9 },
    { url: 'https://dmiyc.com/metodologia', changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://dmiyc.com/sobre-el-proyecto', changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://dmiyc.com/contacto', changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://dmiyc.com/madrid/veredicto', changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://dmiyc.com/madrid/chat', changeFrequency: 'monthly', priority: 0.5 },
  ];
}
