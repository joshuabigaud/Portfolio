import { mkdir, writeFile, cp, readdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getContent, validateContent } from '../src/content.mjs';
import { renderPortfolio } from '../src/render.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const demo = process.argv.includes('--demo');
const output = path.join(root, demo ? '.preview/demo' : 'docs');
// Import sample records only when explicitly building the isolated preview.
const content = demo ? (await import('../src/demo-content.mjs')).getDemoContent() : getContent();
await validateContent(content, { assetRoot: root });
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

function legacyPage(project) {
  const target = `../index.html#project-${project.id}`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0;url=${target}"><meta name="robots" content="noindex"><title>${escape(project.name)} — ${escape(content.profile.name)}</title><link rel="canonical" href="${target}"><link rel="stylesheet" href="../styles.css"></head><body class="legacy-page"><main id="main" class="wrap"><h1>${escape(project.name)}</h1><p>This case study is now part of the portfolio.</p><p><a href="${target}">Read the ${escape(project.name)} case study</a></p><p><a href="mailto:${escape(content.contact.email || content.profile.email)}">Contact ${escape(content.profile.name)}</a></p></main></body></html>`;
}

await mkdir(path.join(output, 'projects'), { recursive: true });
await cp(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
for (const filename of ['styles.css', 'app.js', 'contact-form.js', 'hero-avatar.js', 'avatar.html', 'avatar.css', 'avatar.js']) {
  await cp(path.join(root, 'src', filename), path.join(output, filename));
}
await writeFile(path.join(output, 'index.html'), renderPortfolio(content, { demo }));
await writeFile(path.join(output, '.nojekyll'), '');
const projectPages = new Set(content.projects.map(project => `${project.id}.html`));
for (const filename of await readdir(path.join(output, 'projects'))) {
  if (filename.endsWith('.html') && !projectPages.has(filename)) await unlink(path.join(output, 'projects', filename));
}
for (const project of content.projects) await writeFile(path.join(output, 'projects', `${project.id}.html`), legacyPage(project));

// Vendor the exact installed version. Neither page requires a CDN or backend.
const three = path.join(root, 'node_modules/three');
const vendor = path.join(output, 'vendor/three');
await mkdir(vendor, { recursive: true });
for (const filename of ['three.module.js', 'three.core.js']) await cp(path.join(three, 'build', filename), path.join(vendor, filename));
await cp(path.join(three, 'LICENSE'), path.join(vendor, 'LICENSE'));
for (const filename of ['controls/OrbitControls.js', 'loaders/GLTFLoader.js', 'exporters/GLTFExporter.js', 'utils/BufferGeometryUtils.js']) {
  const dest = path.join(vendor, 'addons', filename);
  await mkdir(path.dirname(dest), { recursive: true });
  await cp(path.join(three, 'examples/jsm', filename), dest);
}
console.log(`Built ${demo ? 'clearly labeled demo' : 'real portfolio'} in ${path.relative(root, output)}/: one portfolio, ${content.projects.length} case-study redirects, and the local 3D viewer.`);
