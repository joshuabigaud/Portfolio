import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { getContent, validateContent } from '../src/content.mjs';
import { getDemoContent } from '../src/demo-content.mjs';
import { projects } from '../src/projects.mjs';

const assetRoot = fileURLToPath(new URL('../', import.meta.url));

test('real content retains authentic projects, a described stack, and existing qualifications', async () => {
  const data = getContent();
  await validateContent(data, { assetRoot });
  for (const source of projects) {
    const project = data.projects.find(item => item.id === source.id);
    for (const [key, value] of Object.entries(source)) assert.deepEqual(project[key], value);
  }
  for (const key of ['timeline', 'achievements']) assert.deepEqual(data[key], []);
  const stackIds = new Set(data.skills.map(item => item.id));
  for (const id of ['react', 'python', 'threejs', 'codex']) assert.ok(stackIds.has(id), `${id}: supported tool remains in the real stack.`);
  assert.ok(data.stackIntro?.trim(), 'The stack explains how the tools relate to the work.');
  for (const item of data.skills) {
    assert.ok(item.description?.trim(), `${item.id}: a real description explains its use.`);
    assert.ok(!item.sample, `${item.id}: real stack entries are not sample records.`);
    for (const key of ['level', 'proficiency', 'years', 'yearsOfExperience', 'certification', 'certifications']) {
      assert.ok(!Object.hasOwn(item, key), `${item.id}: stack records do not invent ${key} claims.`);
    }
  }
  assert.deepEqual(data.certifications.map(item => item.title), ['UX design', 'AI & Python development']);
});

test('demo fills empty sections without mutating real content or authentic projects', async () => {
  const before = getContent();
  const demo = getDemoContent();
  await validateContent(demo, { assetRoot });
  for (const key of ['skills', 'timeline', 'achievements']) assert.ok(demo[key].length);
  assert.deepEqual(demo.skills, before.skills, 'The demo preserves the real stack.');
  assert.deepEqual(demo.skillCategories, before.skillCategories);
  assert.equal(demo.stackIntro, before.stackIntro);
  assert.deepEqual(demo.projects, before.projects);
  assert.deepEqual(getContent(), before);
  demo.profile.expertise[0].title = 'Changed';
  assert.notEqual(getContent().profile.expertise[0].title, 'Changed');
});

test('demo supplies sample stack records only for an empty base without mutating it', async () => {
  const base = getContent();
  base.skills = [];
  base.skillCategories = [];
  for (const project of base.projects) project.skillIds = [];
  const before = structuredClone(base);
  const demo = getDemoContent(base);
  await validateContent(demo, { assetRoot });
  assert.deepEqual(base, before, 'Creating the fallback leaves the supplied base unchanged.');
  assert.ok(demo.skills.length > 0);
  assert.ok(demo.skills.every(item => item.sample === true), 'Only the fallback records are marked as samples.');
  assert.ok(demo.skills.some(item => item.id === 'sample-javascript'));
  assert.deepEqual(demo.projects, before.projects, 'Fallback content does not replace authentic projects.');
  demo.profile.expertise[0].title = 'Changed in demo';
  assert.deepEqual(base, before, 'The returned demo owns its nested data.');
});

test('content validation rejects duplicate IDs', async () => {
  const data = getContent();
  data.certifications.push({ ...data.certifications[0] });
  await assert.rejects(validateContent(data), /duplicate ID/);
});

test('content validation rejects missing category and technology relationships', async () => {
  const data = getDemoContent();
  data.skills[0].categoryId = 'absent';
  await assert.rejects(validateContent(data), /unknown category absent/);
  const withUnknownSkill = getContent();
  withUnknownSkill.projects[0].skillIds = ['absent'];
  await assert.rejects(validateContent(withUnknownSkill), /unknown skill absent/);
});

test('content validation catches missing and nonlocal assets before rendering', async () => {
  const missing = getContent();
  missing.profile.badge.portrait = 'assets/not-a-real-portrait.png';
  await assert.rejects(validateContent(missing, { assetRoot }), /Missing local asset/);
  const escaped = getContent();
  escaped.profile.badge.portrait = '../private.png';
  await assert.rejects(validateContent(escaped, { assetRoot }), /must stay within the site/);
  const remote = getContent();
  remote.profile.avatar.modelUrl = 'https://example.com/avatar.glb';
  await assert.rejects(validateContent(remote), /repository-relative/);
});

test('new records can be added without any template changes', async () => {
  const data = getContent();
  data.skillCategories.push({ id: 'new-category', label: 'New category', color: '#eeeeee' });
  data.skills.push({ id: 'new-skill', name: 'A long skill name for layout checks', symbol: 'Ns', categoryId: 'new-category' });
  data.projects[0].skillIds.push('new-skill');
  data.timeline.push({ id: 'new-stage', year: 'Next', type: 'milestone', title: 'A new stage' });
  data.achievements.push({ id: 'new-highlight', title: 'A new highlight', category: 'Milestone', displayText: 'Complete' });
  await validateContent(data, { assetRoot });
});
