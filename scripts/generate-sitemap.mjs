import { writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

/**
 * Генератор карти сайту sitemap.xml для Slovko (SEO-v8 § 5).
 *
 * Публічні маршрути йдуть у sitemap, службові (/beta-test-checklists) виключаються.
 */
const SITE_ORIGIN = 'https://alik532ua.github.io';
const BASE_PATH = '/Slovko';

const PUBLIC_ENTRIES = [
	'/'
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_ENTRIES.map(
	(route) => `  <url>
    <loc>${SITE_ORIGIN}${BASE_PATH}${route === '/' ? '/' : route}</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`
).join('\n')}
</urlset>
`;

const staticPath = resolve('static/sitemap.xml');
writeFileSync(staticPath, sitemap.trim() + '\n', 'utf8');

const buildDir = resolve('build');
if (existsSync(buildDir)) {
	writeFileSync(join(buildDir, 'sitemap.xml'), sitemap.trim() + '\n', 'utf8');
}

console.log('Slovko: sitemap.xml generated successfully.');
