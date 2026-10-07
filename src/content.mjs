import { access } from 'node:fs/promises';
import path from 'node:path';
import { profile as originalProfile, projects } from './projects.mjs';
import { stackCategories, stackItems } from './stack.mjs';
import { validContactEndpoint } from './contact-form.js';

/** @typedef {{label:string, href:string}} PortfolioLink */
/** @typedef {{id:string, title:string, description?:string}} Expertise */
/** @typedef {{id:string, label:string, color:string}} SkillCategory */
/** @typedef {{id:string, name:string, symbol:string, categoryId:string, logo?:string, description?:string, sample?:boolean}} Skill */
/** @typedef {{id:string, title:string, issuer?:string, year?:string, href?:string}} Certification */
/** @typedef {{id:string, year?:string, stage?:string, dateRange?:string, type?:'education'|'experience'|'milestone', title:string, organization?:string, description?:string, highlights?:string[], tags?:string[], sample?:boolean}} TimelineEntry */
/** @typedef {{id:string, title:string, category:string, description?:string, icon?:string, value?:number, prefix?:string, suffix?:string, displayText?:string, href?:string, sample?:boolean}} Achievement */
/** @typedef {(typeof projects)[number] & {skillIds?:string[], links?:PortfolioLink[]}} Project */
/**
 * All content is supplied at build time; no personal data is fetched at runtime.
 * Empty collections omit their sections in the normal build. Sample content lives
 * in demo-content.mjs, which the normal build does not import or publish.
 * @typedef {object} PortfolioContent
 * @property {{name:string, initials:string, role:string, email:string, heroTitle:string[], tagline:string, introduction:string[], backgroundWord:string, aboutHeading:string, resumeUrl?:string, socialLinks:PortfolioLink[], quickFacts:{label:string,value:string}[], expertise:Expertise[], badge:{portrait?:string,idLabel?:string,department?:string,footerText?:string}, avatar:{modelUrl?:string,posterUrl?:string,accessibleLabel:string}}} profile
 * @property {SkillCategory[]} skillCategories
 * @property {Skill[]} skills
 * @property {string} stackIntro
 * @property {Project[]} projects
 * @property {Certification[]} certifications
 * @property {TimelineEntry[]} timeline
 * @property {Achievement[]} achievements
 * @property {{heading:string,message:string,email?:string,formEndpoint?:string,formEmbedUrl?:string,links:PortfolioLink[]}} contact
 */

/** @type {PortfolioContent} */
export const content = {
  profile: {
    ...originalProfile,
    initials: 'JB',
    heroTitle: ['Thoughtful software.', 'Built to be useful.'],
    tagline: 'I’m an independent designer and developer turning complex ideas into clear, useful digital experiences.',
    backgroundWord: 'JOSHUA',
    aboutHeading: 'I care about how it works. And how it feels to use.',
    introduction: [
      'I’m an independent designer and developer with certificates in UX design and AI & Python development. I learn by building: taking an idea, shaping the experience, and working through the details that make it useful.',
      'Each project here is self-directed. I work across design and development, using AI tools as part of my process to explore, build, and iterate. Much of what I know is self-taught, and these projects are where I put that learning into practice.',
    ],
    socialLinks: [],
    quickFacts: [
      { label: 'Practice', value: 'Independent design & development' },
      { label: 'Approach', value: 'Learning by building' },
      { label: 'Work', value: 'Self-directed projects' },
      { label: 'Focus', value: 'Clear, useful digital experiences' },
    ],
    expertise: [
      { id: 'product-thinking', title: 'Product thinking', description: 'Turning complex ideas into useful experiences.' },
      { id: 'interface-design', title: 'Interface design', description: 'Shaping how a product works and feels to use.' },
      { id: 'development', title: 'Development', description: 'Building, learning, and iterating through working software.' },
    ],
    badge: {
      portrait: 'assets/avatar/joshua-avatar.png',
      idLabel: 'DESIGNER & DEVELOPER',
      department: 'Independent projects',
      footerText: 'Made with curiosity.',
    },
    avatar: {
      modelUrl: 'assets/avatar/joshua-avatar.glb',
      posterUrl: 'assets/avatar/joshua-avatar.png',
      accessibleLabel: 'Clay-style avatar of Joshua in a navy suit.',
    },
  },
  stackIntro: 'Tools and technologies used across my independent projects and AI-assisted workflows. I learn through building, testing, and iteration, with AI tools as part of the process. Select a tile to see how it fits into the work.',
  skillCategories: stackCategories,
  skills: stackItems,
  projects: projects.map(project => ({ ...project, skillIds: [], links: [] })),
  certifications: [
    { id: 'ux-design', title: 'UX design' },
    { id: 'ai-python-development', title: 'AI & Python development' },
  ],
  timeline: [],
  achievements: [],
  contact: {
    heading: 'Let’s build something together.',
    message: 'Good things start with a conversation.',
    email: originalProfile.email,
    // Public form submission URL only; never put a private API key here.
    formEndpoint: '',
    // A hosted form (for example Zoho Forms) can be embedded instead of using AJAX.
    formEmbedUrl: 'https://forms.zohopublic.com/joshuabigaudgm1/form/Contact/formperma/QKnpiS97srtPxt73Z92BD2G1b2BvY6SKlrdncq7HqVM',
    links: [],
  },
};

/** Return an independent copy suitable for preview customization. @returns {PortfolioContent} */
export function getContent() {
  return structuredClone(content);
}

const collections = ['skillCategories', 'skills', 'projects', 'certifications', 'timeline', 'achievements'];
const isRemote = value => /^(?:https?:|mailto:|tel:)/i.test(value);

/**
 * Catch content errors before publishing. Asset references are local and relative
 * so the same output works at a domain root or GitHub Pages repository prefix.
 * @param {PortfolioContent} data
 * @param {{assetRoot?:string}} [options]
 */
export async function validateContent(data, { assetRoot } = {}) {
  if (!data?.profile?.name || !data?.contact) throw new Error('Profile name and contact configuration are required.');
  if (data.contact.formEndpoint && !validContactEndpoint(data.contact.formEndpoint)) {
    throw new Error('Contact formEndpoint must be a public HTTPS submission URL without credentials or a fragment.');
  }
  if (data.contact.formEmbedUrl && !validContactEndpoint(data.contact.formEmbedUrl)) {
    throw new Error('Contact formEmbedUrl must be a public HTTPS form URL without credentials or a fragment.');
  }
  if (data.contact.formEndpoint && data.contact.formEmbedUrl) {
    throw new Error('Configure either formEndpoint or formEmbedUrl, not both.');
  }
  const checkIds = (items, name) => {
    if (!Array.isArray(items)) throw new Error(`${name} must be an array.`);
    const ids = new Set();
    for (const item of items) {
      if (!/^[a-z][a-z0-9-]*$/.test(item.id || '')) throw new Error(`${name}: invalid stable ID ${item.id}.`);
      if (ids.has(item.id)) throw new Error(`${name}: duplicate ID ${item.id}.`);
      ids.add(item.id);
    }
    return ids;
  };
  for (const collection of collections) checkIds(data[collection], collection);
  checkIds(data.profile.expertise, 'expertise');
  const categoryIds = new Set(data.skillCategories.map(category => category.id));
  const skillIds = new Set(data.skills.map(skill => skill.id));
  for (const skill of data.skills) {
    if (!categoryIds.has(skill.categoryId)) throw new Error(`Skill ${skill.id}: unknown category ${skill.categoryId}.`);
  }
  for (const project of data.projects) {
    for (const skillId of project.skillIds || []) {
      if (!skillIds.has(skillId)) throw new Error(`Project ${project.id}: unknown skill ${skillId}.`);
    }
    if (!project.image || /(?:generated|placeholder|concept)/i.test(project.image)) {
      throw new Error(`Project ${project.id}: use an authentic application capture.`);
    }
  }
  for (const achievement of data.achievements) {
    if (achievement.value !== undefined && !Number.isFinite(achievement.value)) throw new Error(`Achievement ${achievement.id}: value must be finite.`);
  }

  const localAssets = [
    data.profile.badge.portrait, data.profile.avatar.modelUrl, data.profile.avatar.posterUrl,
    ...data.skills.map(skill => skill.logo),
    ...data.projects.map(project => `assets/projects/${project.image}`),
    ...data.achievements.map(achievement => achievement.icon).filter(icon => icon?.includes('/')),
  ].filter(Boolean);
  const links = [
    data.profile.resumeUrl, ...data.profile.socialLinks.map(link => link.href),
    ...data.contact.links.map(link => link.href),
    ...data.certifications.map(certificate => certificate.href),
    ...data.achievements.map(achievement => achievement.href),
    ...data.projects.flatMap(project => [project.url, ...(project.links || []).map(link => link.href)]),
  ].filter(Boolean);
  for (const link of links) {
    if (/^(?:javascript:|data:|\/\/)/i.test(link)) throw new Error(`Unsupported content link: ${link}`);
    if (!isRemote(link) && !link.startsWith('#')) localAssets.push(link);
  }
  for (const asset of new Set(localAssets)) {
    if (isRemote(asset) || asset.startsWith('/') || /^[a-z]+:/i.test(asset)) throw new Error(`Asset must be repository-relative: ${asset}`);
    const filename = decodeURIComponent(asset.split(/[?#]/, 1)[0]);
    if (filename.split(/[\\/]/).includes('..')) throw new Error(`Asset must stay within the site: ${asset}`);
    if (assetRoot) {
      try { await access(path.join(assetRoot, filename)); }
      catch { throw new Error(`Missing local asset: ${asset}`); }
    }
  }
  return data;
}
