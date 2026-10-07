import test from 'node:test';
import assert from 'node:assert/strict';
import { getContent, validateContent } from '../src/content.mjs';
import { getDemoContent } from '../src/demo-content.mjs';
import { renderPortfolio } from '../src/render.mjs';

const decode = value => value.replace(/&(amp|lt|gt|quot|#39);/g, (_, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[entity]));
const text = html => decode(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
const attributeValues = (html, attribute) => [...html.matchAll(new RegExp(`\\s${attribute}="([^"]*)"`, 'g'))].map(match => decode(match[1]));
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Extract an element including nested elements of the same tag, without a DOM dependency. */
function elementById(html, id) {
  const opener = new RegExp(`<([a-z][a-z0-9-]*)\\b[^>]*\\sid="${escapeRegExp(id)}"[^>]*>`, 'i').exec(html);
  assert.ok(opener, `Element #${id} exists.`);
  const tag = opener[1];
  const tokens = new RegExp(`</?${tag}\\b[^>]*>`, 'gi');
  tokens.lastIndex = opener.index;
  let depth = 0;
  for (let token; (token = tokens.exec(html));) {
    depth += token[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(opener.index, tokens.lastIndex);
  }
  assert.fail(`Element #${id} has a closing tag.`);
}

function assertNoBrokenFragmentLinks(html) {
  const ids = attributeValues(html, 'id');
  assert.equal(new Set(ids).size, ids.length, 'Rendered DOM IDs are unique.');
  for (const href of attributeValues(html, 'href').filter(value => value.startsWith('#'))) {
    assert.ok(ids.includes(decodeURIComponent(href.slice(1))), `Fragment ${href} has a target.`);
  }
  for (const id of attributeValues(html, 'aria-controls')) assert.ok(ids.includes(id), `Control target ${id} exists.`);
}

test('all seven inline case studies retain their authentic copy, image, and crop', () => {
  const data = getContent();
  const html = renderPortfolio(data);
  assert.equal(data.projects.length, 7, 'This regression baseline covers all seven existing projects.');
  for (const project of data.projects) {
    const card = elementById(html, `project-${project.id}`);
    const visible = text(card);
    for (const field of ['name', 'type', 'category', 'line', 'status', 'intro', 'idea', 'focus', 'current', 'caption']) {
      assert.ok(visible.includes(project[field]), `${project.id}: ${field} remains readable in its own case study.`);
    }
    for (const [title, body] of project.details) {
      assert.ok(visible.includes(title), `${project.id}: detail heading retained.`);
      assert.ok(visible.includes(body), `${project.id}: detail explanation retained.`);
    }
    assert.ok(attributeValues(card, 'src').includes(`assets/projects/${project.image}`), `${project.id}: authentic source image.`);
    assert.ok(attributeValues(card, 'alt').includes(project.alt), `${project.id}: original image description.`);
    assert.match(card, new RegExp(`class="capture crop-${project.crop}"`), `${project.id}: original framing choice.`);
    assert.match(card, /<details\b[^>]*\sopen>/, `${project.id}: project content initially available without JavaScript.`);
  }
  assertNoBrokenFragmentLinks(html);
});

test('content punctuation and HTML-like text stay intact without creating markup', () => {
  const data = getContent();
  const marker = `An "example" & 'detail' <script data-test="content">unsafe()</script>`;
  const project = data.projects[0];
  for (const field of ['name', 'type', 'category', 'line', 'status', 'intro', 'idea', 'focus', 'current', 'caption', 'alt']) project[field] = `${field}: ${marker}`;
  project.details = [[`Heading: ${marker}`, `Body: ${marker}`]];
  const html = renderPortfolio(data);
  const card = elementById(html, `project-${project.id}`);
  for (const field of ['name', 'type', 'category', 'line', 'status', 'intro', 'idea', 'focus', 'current', 'caption']) {
    assert.ok(text(card).includes(project[field]), `${field}: special characters survive as text.`);
  }
  assert.ok(attributeValues(card, 'alt').includes(project.alt), 'Attribute special characters survive as text.');
  assert.doesNotMatch(html, /<script data-test=/, 'Configured text never becomes a script element.');
  assertNoBrokenFragmentLinks(html);
});

test('empty optional collections remove their sections and every anchor targeting them', () => {
  const data = getContent();
  for (const key of ['skills', 'skillCategories', 'projects', 'certifications', 'timeline', 'achievements']) data[key] = [];
  const html = renderPortfolio(data);
  for (const id of ['skills', 'work', 'certifications', 'journey', 'highlights']) {
    assert.ok(!attributeValues(html, 'id').includes(id), `${id}: no empty section.`);
    assert.ok(!attributeValues(html, 'href').includes(`#${id}`), `${id}: no broken nav or hero action.`);
  }
  assertNoBrokenFragmentLinks(html);
  const numbers = [...html.matchAll(/class="section-label"><span>(\d+)<\/span>/g)].map(match => Number(match[1]));
  assert.deepEqual(numbers, [1, 2], 'Remaining About and Contact sections are numbered consecutively.');
});

test('larger collections render stable identities and generated counts without fixed limits', async () => {
  const data = getContent();
  data.skillCategories = [{ id: 'additional-category', label: 'An additional category', color: '#eeeedd' }];
  data.skills = Array.from({ length: 35 }, (_, i) => ({ id: `added-skill-${i + 1}`, name: `Additional skill ${i + 1}`, symbol: `S${i + 1}`, categoryId: 'additional-category' }));
  data.projects = Array.from({ length: 10 }, (_, i) => ({ ...structuredClone(data.projects[i % data.projects.length]), id: `additional-project-${i + 1}`, name: `Additional project ${i + 1}`, skillIds: [`added-skill-${i + 1}`] }));
  data.certifications = Array.from({ length: 11 }, (_, i) => ({ id: `additional-certificate-${i + 1}`, title: `Additional qualification ${i + 1}` }));
  data.timeline = Array.from({ length: 5 }, (_, i) => ({ id: `additional-stage-${i + 1}`, year: `Stage ${i + 1}`, type: 'milestone', title: `Additional journey ${i + 1}` }));
  data.achievements = Array.from({ length: 9 }, (_, i) => ({ id: `additional-highlight-${i + 1}`, category: 'Milestone', title: `Additional highlight ${i + 1}`, value: i + 1 }));
  await validateContent(data);
  const html = renderPortfolio(data);
  const recordIds = attributeValues(html, 'data-record-id');
  for (const collection of [data.skillCategories, data.skills, data.projects, data.certifications, data.timeline, data.achievements]) {
    for (const item of collection) assert.equal(recordIds.filter(id => id === item.id).length, 1, `${item.id}: rendered once with its stable identity.`);
  }
  assert.equal(attributeValues(html, 'data-skill').length, 35, 'Every skill has an interactive tile.');
  assert.equal(attributeValues(html, 'data-select-project').length, 10, 'Every project remains selectable.');
  assert.match(text(elementById(html, 'certifications')), /11 qualifications\./, 'Qualification count follows the collection.');
  assert.match(text(elementById(html, 'highlights')), /09 \/ 09/, 'Highlight numbering follows the collection.');
  assert.match(elementById(html, 'skills'), /class="skill-index"[^>]*>35<\/span>/, 'Skill numbering is not limited to 32.');
  assert.match(elementById(html, 'work'), /class="project-ordinal">10<\/span>/, 'Project numbering is not limited to seven.');
  const numbers = [...html.matchAll(/class="section-label"><span>(\d+)<\/span>/g)].map(match => Number(match[1]));
  assert.deepEqual(numbers, [1, 2, 3, 4, 5, 6, 7], 'Section numbers follow the rendered sequence.');
  assertNoBrokenFragmentLinks(html);
});

test('sample records and disclosure remain confined to the explicitly rendered demo', () => {
  const real = renderPortfolio(getContent());
  const data = getDemoContent();
  const demo = renderPortfolio(data, { demo: true });
  for (const collection of [data.skills, data.timeline, data.achievements]) {
    for (const item of collection) {
      if (item.sample) assert.ok(!real.includes(`data-record-id="${item.id}"`), `${item.id}: sample absent from real output.`);
      else assert.ok(real.includes(`data-record-id="${item.id}"`), `${item.id}: real content remains visible in both builds.`);
      assert.ok(demo.includes(`data-record-id="${item.id}"`), `${item.id}: visible in demo output.`);
    }
  }
  assert.doesNotMatch(real, /demo-banner|sample-note|A fictional counter|Sample journey entry/);
  assert.match(demo, /class="demo-banner"/);
  assert.match(demo, /not personal claims/i);
  assert.match(demo, /name="robots" content="noindex,nofollow"/);
  for (const [id, items] of [['skills', data.skills], ['journey', data.timeline], ['highlights', data.achievements]]) {
    if (items.some(item => item.sample)) assert.match(elementById(demo, id), /class="sample-note"/);
    else assert.doesNotMatch(elementById(demo, id), /class="sample-note"/, `${id}: real records are not called samples.`);
  }
  assertNoBrokenFragmentLinks(demo);
});

test('real Stack keeps the periodic table and compatible anchors without sample or expertise labels', () => {
  const data = getContent();
  const real = renderPortfolio(data);
  const demo = renderPortfolio(getDemoContent(), { demo: true });
  for (const html of [real, demo]) {
    const stack = elementById(html, 'skills');
    assert.match(elementById(html, 'primary-nav'), /href="#skills">Stack<\/a>/, 'Visible Stack link keeps the existing fragment.');
    assert.equal(text(elementById(html, 'skills-title')), 'The tools behind my work.');
    assert.match(stack, /class="section-label"><span>\d+<\/span> — Stack<\/p>/);
    assert.ok(text(stack).includes(data.stackIntro));
    assert.equal(attributeValues(stack, 'data-skill').length, data.skills.length, 'The periodic table contains all real stack entries.');
    const labels = attributeValues(stack, 'aria-label');
    assert.ok(labels.some(value => /^(?:stack|technology|tool|tools) categories$/i.test(value)), 'Categories have a stack-specific accessible name.');
    assert.ok(labels.some(value => /^selected (?:tool(?: or technology)?|technology|stack(?: item)?)$/i.test(value)), 'The preview is named as a stack item, not a skill claim.');
    assert.ok(!labels.some(value => /^(?:skill categories|selected skill)$/i.test(value)));
    assert.doesNotMatch(stack, /class="sample-note"|sample stack|sample skills|select a skill/i);
    assertNoBrokenFragmentLinks(html);
  }
  const banner = demo.match(/<aside class="demo-banner"[\s\S]*?<\/aside>/)?.[0] || '';
  assert.doesNotMatch(text(banner), /sample (?:skills|stack)/i, 'The demo banner does not mislabel the real stack.');
});

test('Stack intro is configurable and HTML-like content remains text', () => {
  const data = getContent();
  data.stackIntro = `Tools & context: "quoted" <script data-test="stack-intro">unsafe()</script>`;
  const html = renderPortfolio(data);
  const stack = elementById(html, 'skills');
  assert.ok(text(stack).includes(data.stackIntro));
  assert.doesNotMatch(html, /<script data-test="stack-intro">/);
  assertNoBrokenFragmentLinks(html);
});

test('empty-stack demo fallback is explicitly labeled and has readable no-JS descriptions', () => {
  const base = getContent();
  base.skills = [];
  base.skillCategories = [];
  for (const project of base.projects) project.skillIds = [];
  const data = getDemoContent(base);
  const html = renderPortfolio(data, { demo: true });
  const stack = elementById(html, 'skills');
  assert.match(stack, /class="sample-note"/);
  const fallback = stack.match(/<noscript><dl class="skill-static">([\s\S]*?)<\/dl><\/noscript>/)?.[1];
  assert.ok(fallback, 'A semantic list is available without JavaScript.');
  for (const item of data.skills) {
    assert.ok(item.sample);
    assert.ok(text(fallback).includes(item.name));
    assert.ok(text(fallback).includes(item.description));
  }
  assertNoBrokenFragmentLinks(html);
});

test('credentials and optional links appear only when configured', () => {
  const data = getContent();
  const initial = renderPortfolio(data);
  const certificateSection = elementById(initial, 'certifications');
  assert.equal(attributeValues(certificateSection, 'href').length, 0, 'Unlinked qualifications have no inert credential buttons.');
  assert.doesNotMatch(elementById(initial, 'about'), /Résumé|github\.com|linkedin\.com/);
  const issuer = 'Configured issuer & program';
  data.certifications[0] = { ...data.certifications[0], issuer, year: '2026', href: 'https://example.com/credential?id=one&view=public' };
  data.profile.resumeUrl = 'assets/resume.pdf';
  data.profile.socialLinks.push({ label: 'Configured profile', href: 'https://example.com/profile' });
  data.contact.links.push({ label: 'Configured contact', href: 'https://example.com/contact' });
  const configured = renderPortfolio(data);
  assert.deepEqual(attributeValues(elementById(configured, 'certifications'), 'href'), [data.certifications[0].href]);
  assert.ok(text(elementById(configured, 'certifications')).includes(`${issuer} · 2026`));
  assert.ok(attributeValues(elementById(configured, 'about'), 'href').includes('assets/resume.pdf'));
  assert.ok(attributeValues(elementById(configured, 'about'), 'href').includes('https://example.com/profile'));
  assert.ok(attributeValues(elementById(configured, 'contact'), 'href').includes('https://example.com/contact'));
});

test('timeline entries are data-only, ordered, and never gain a duplicate Next card', () => {
  const data = getDemoContent();
  const expected = data.timeline.map(item => item.id);
  const html = renderPortfolio(data, { demo: true });
  const timeline = elementById(html, 'journey');
  assert.deepEqual(attributeValues(timeline, 'data-record-id'), expected);
  assert.equal((timeline.match(/class="timeline-entry"/g) || []).length, data.timeline.length);
  assert.equal((timeline.match(/class="timeline-year">Next<\/p>/g) || []).length, 1);
  data.timeline = [];
  assert.ok(!attributeValues(renderPortfolio(data), 'id').includes('journey'), 'No fabricated future entry appears for an empty timeline.');
});

test('custom profile names, headings, badge text, and contact text come from configuration', () => {
  const data = getContent();
  data.profile.name = 'Avery Example';
  data.profile.initials = 'AE';
  data.profile.heroTitle = ['Interfaces & ideas.', 'Made for humans.'];
  data.profile.tagline = 'A configured introduction.';
  data.profile.backgroundWord = 'AVERY';
  data.profile.aboutHeading = 'A configured perspective on useful work.';
  data.profile.badge.idLabel = 'CREATIVE PRACTICE';
  data.profile.badge.footerText = 'A configured badge footer.';
  data.contact.heading = 'Make something meaningful together.';
  data.contact.message = 'A configured contact invitation.';
  const html = renderPortfolio(data);
  assert.equal(text(elementById(html, 'intro-title')), data.profile.heroTitle.join(''));
  assert.equal(text(elementById(html, 'contact-title')), data.contact.heading);
  for (const value of [data.profile.name, data.profile.initials, data.profile.backgroundWord, data.profile.tagline, data.profile.aboutHeading, data.profile.badge.idLabel, data.profile.badge.footerText, data.contact.message]) {
    assert.ok(text(html).includes(value), `Configured text survives: ${value}`);
  }
  assert.doesNotMatch(elementById(html, 'intro-title'), /Thoughtful|Built to be useful/);
  assert.doesNotMatch(elementById(html, 'contact-title'), /Let’s build/);
});
