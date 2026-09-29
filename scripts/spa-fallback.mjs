// GitHub Pages has no SPA rewrites: serve index.html for unknown paths via 404.html, so deep
// links like /masters/m-anna-serova work. .nojekyll keeps files starting with "_" published.
import { copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = 'dist/nails-app/browser';
copyFileSync(join(out, 'index.html'), join(out, '404.html'));
writeFileSync(join(out, '.nojekyll'), '');
console.log('SPA fallback written: 404.html, .nojekyll');
