/**
 * Renders the page to static HTML at build time. The markup ships in
 * index.html, so the hero paints without waiting for the JS bundle.
 */
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const { render } = await import('./dist-ssr/entry-server.js');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const body = render();

const out = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
if (out === html) throw new Error('prerender: could not find the root container');
fs.writeFileSync(path.join(dist, 'index.html'), out);
console.log(`prerendered ${(body.length / 1024).toFixed(1)} kB of markup into dist/index.html`);
