import assert from 'node:assert/strict';
import { readdir, readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getContent, validateContent } from '../src/content.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const demo = process.argv.includes('--demo');
const root = path.join(projectRoot, demo ? '.preview/demo' : 'docs');
const content = demo ? (await import('../src/demo-content.mjs')).getDemoContent() : getContent();
await validateContent(content, { assetRoot: root });
const pages = ['index.html', 'avatar.html', ...(await readdir(path.join(root, 'projects'))).filter(p => p.endsWith('.html')).map(p => `projects/${p}`)];
const cache = new Map();
async function source(filename) {
  if (!cache.has(filename)) cache.set(filename, await readFile(filename, 'utf8'));
  return cache.get(filename);
}
let links = 0;
async function checkReference(reference, from, { fragment = true } = {}) {
  const link = reference.replaceAll('&amp;', '&');
  if (/^(?:https?:|mailto:|tel:|data:)/i.test(link)) return;
  assert.ok(!link.startsWith('/') && !/^[a-z]+:/i.test(link), `${from}: use relative links for GitHub Pages: ${link}`);
  const [resource, hash] = link.split('#', 2);
  const filename = decodeURIComponent(resource.split('?', 1)[0]);
  const resolved = filename ? path.resolve(path.dirname(from), filename) : from;
  assert.ok(resolved === root || resolved.startsWith(root + path.sep), `${from}: reference escapes output: ${link}`);
  await access(resolved);
  if (hash && fragment) {
    const target = await source(resolved);
    assert.ok(target.includes(`id="${decodeURIComponent(hash)}"`), `${path.relative(root, from)}: missing fragment ${link}`);
  }
  links++;
}

for (const page of pages) {
  const filename = path.join(root, page);
  const html = await source(filename);
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${page}: one page heading`);
  assert.ok(html.includes('lang="en"'), `${page}: document language`);
  assert.ok(html.includes(`mailto:${content.contact.email}`), `${page}: contact address`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${page}: unique element IDs`);
  for (const match of html.matchAll(/(?:href|src|poster)="([^"]+)"/g)) await checkReference(match[1], filename);
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)) {
    assert.ok(!/^https?:|^\/\//i.test(match[1]), `${page}: runtime resources must be local: ${match[1]}`);
  }
  if (page.startsWith('projects/')) {
    const id = path.basename(page, '.html');
    assert.ok(html.includes(`content="0;url=../index.html#project-${id}"`), `${page}: compatibility redirect`);
    assert.ok(html.includes(`href="../index.html#project-${id}"`), `${page}: ordinary fallback link`);
  }
}

const index = await source(path.join(root, 'index.html'));
const expectedSections = {
  skills: content.skills.length, work: content.projects.length, certifications: content.certifications.length,
  journey: content.timeline.length, highlights: content.achievements.length,
};
for (const [section, count] of Object.entries(expectedSections)) {
  assert.equal(index.includes(`id="${section}"`), count > 0, `${section}: section reflects collection presence`);
  if (count === 0) assert.ok(!index.includes(`href="#${section}"`), `${section}: no empty navigation link`);
}
const expectedProjectPages = content.projects.map(project => `projects/${project.id}.html`).sort();
assert.deepEqual(pages.filter(page => page.startsWith('projects/')).sort(), expectedProjectPages, 'Legacy pages match configured projects.');
for (const project of content.projects) {
  assert.ok(index.includes(`id="project-${project.id}"`), `${project.id}: linkable inline case study`);
  assert.ok(index.includes(`assets/projects/${project.image}`), `${project.id}: authentic image retained`);
}
if (demo) {
  assert.match(index, /sample|demo/i, 'Demo is clearly labeled.');
  assert.match(index, /sample-practice/, 'Demo achievement examples are present.');
} else {
  assert.doesNotMatch(index, /sample-practice|sample-learn|sample-javascript|fictional counter/i, 'Published page contains no sample records.');
  const topFiles = await readdir(root);
  assert.ok(!topFiles.some(name => /demo-content|sample-content|demo\.html/.test(name)), 'Sample source is excluded from normal output.');
}

for (const filename of ['styles.css', 'avatar.css']) {
  const fullPath = path.join(root, filename);
  const css = await source(fullPath);
  for (const match of css.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)) {
    assert.ok(!/^(?:https?:|\/\/)/i.test(match[1]), `${filename}: external CSS resource`);
    await checkReference(match[1], fullPath, { fragment: false });
  }
  assert.doesNotMatch(css, /@import\s+['"]https?:/i, `${filename}: external stylesheet import`);
}
for (const filename of ['app.js', 'contact-form.js', 'hero-avatar.js', 'avatar.js']) {
  const js = await source(path.join(root, filename));
  assert.doesNotMatch(js, /(?:import\s*\(?|from\s*|fetch\s*\()\s*['"]https?:/i, `${filename}: external runtime dependency`);
}
console.log(`Verified ${demo ? 'demo' : 'real'} output: ${pages.length} pages, ${links} local links/assets, ${content.projects.length} authentic project images, content-driven sections, redirects, and local runtime resources.`);
