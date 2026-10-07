/** Progressive enhancement for the data-driven portfolio. */
import { initContactForm } from './contact-form.js';
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const desktopQuery = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
const mobileQuery = window.matchMedia('(max-width: 767px)');
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const scrollBehavior = () => motionQuery.matches ? 'instant' : 'smooth';

function initNavigation() {
  const navigation = document.querySelector('[data-navigation]');
  if (!navigation) return;
  const toggle = document.querySelector('[data-nav-toggle]');
  const links = [...navigation.querySelectorAll('a[href^="#"]')];
  const destinations = new Set(links.map(link => link.hash));
  const sections = [...document.querySelectorAll('section[id][data-section]')].filter(section => destinations.has(`#${section.id}`));
  let expanded = false;
  let scheduled = false;
  navigation.classList.add('is-enhanced');
  function setExpanded(value) {
    expanded = value;
    navigation.classList.toggle('is-open', expanded);
    navigation.hidden = mobileQuery.matches && !expanded;
    if (toggle) {
      toggle.hidden = !mobileQuery.matches;
      toggle.setAttribute('aria-expanded', String(expanded));
    }
  }
  toggle?.addEventListener('click', () => setExpanded(!expanded));
  navigation.addEventListener('click', event => {
    if (event.target.closest('a[href^="#"]')) setExpanded(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && expanded && mobileQuery.matches) {
      setExpanded(false);
      toggle?.focus();
    }
  });
  document.addEventListener('click', event => {
    if (expanded && !navigation.contains(event.target) && !toggle?.contains(event.target)) setExpanded(false);
  });
  mobileQuery.addEventListener('change', () => setExpanded(false));
  setExpanded(false);
  function trackSection() {
    scheduled = false;
    const threshold = Math.max(100, (document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0) + 45);
    let current = '';
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= threshold) current = section.id;
    }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 3) current = sections.at(-1)?.id || current;
    for (const link of links) {
      const active = link.hash === `#${current}`;
      link.classList.toggle('is-current', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  const requestTrack = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(trackSection);
  };
  window.addEventListener('scroll', requestTrack, { passive: true });
  window.addEventListener('resize', requestTrack, { passive: true });
  window.addEventListener('load', requestTrack);
  trackSection();
}

function initBadges() {
  for (const badge of document.querySelectorAll('[data-flip-badge]')) {
    const button = badge.querySelector('[data-badge-toggle]') || badge.parentElement?.querySelector('[data-badge-toggle]');
    const hint = badge.parentElement?.querySelector('[data-badge-hint]');
    const front = badge.querySelector('[data-badge-face="front"]');
    const back = badge.querySelector('[data-badge-face="back"]');
    if (!button || !front || !back) continue;
    button.hidden = false;
    if (hint) hint.hidden = false;
    let flipped = false;
    const update = () => {
      badge.classList.toggle('is-flipped', flipped);
      front.setAttribute('aria-hidden', String(flipped));
      back.setAttribute('aria-hidden', String(!flipped));
      front.inert = flipped;
      back.inert = !flipped;
      button.setAttribute('aria-pressed', String(flipped));
      const label = button.querySelector('[data-badge-toggle-label]');
      if (label) label.textContent = flipped ? 'Show front' : 'Flip badge';
      button.setAttribute('aria-label', flipped ? 'Show front of developer badge' : 'Flip badge to see areas of expertise');
    };
    button.addEventListener('click', () => { flipped = !flipped; update(); });
    update();
  }
}

function initSkills() {
  const preview = document.querySelector('[data-skill-preview]');
  const skills = [...document.querySelectorAll('[data-skill]')];
  const categories = [...document.querySelectorAll('[data-skill-category]')];
  if (!skills.length) return;
  const art = preview?.querySelector('[data-preview-art]');
  const name = preview?.querySelector('[data-preview-name]');
  const category = preview?.querySelector('[data-preview-category]');
  const description = preview?.querySelector('[data-preview-description]');
  let selected;
  function selectSkill(skill) {
    selected = skill;
    for (const tile of skills) {
      const active = tile === skill;
      tile.classList.toggle('is-selected', active);
      tile.setAttribute('aria-pressed', String(active));
    }
    if (name) name.textContent = skill.dataset.name || '';
    if (category) category.textContent = skill.dataset.categoryLabel || skill.dataset.category || '';
    if (description) description.textContent = skill.dataset.description || '';
    if (art) {
      art.textContent = skill.dataset.symbol || '';
      if (skill.dataset.logo) {
        const logo = new Image();
        logo.alt = '';
        logo.decoding = 'async';
        logo.addEventListener('load', () => { if (selected === skill) art.replaceChildren(logo); }, { once: true });
        logo.src = skill.dataset.logo;
      }
    }
  }
  for (const skill of skills) {
    skill.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') selectSkill(skill); });
    skill.addEventListener('focus', () => selectSkill(skill));
    skill.addEventListener('click', () => selectSkill(skill));
  }
  for (const control of categories) {
    control.addEventListener('click', () => {
      const selectedCategory = control.dataset.skillCategory;
      for (const categoryButton of categories) {
        const active = categoryButton === control;
        categoryButton.setAttribute('aria-pressed', String(active));
        categoryButton.classList.toggle('is-selected', active);
      }
      for (const skill of skills) skill.classList.toggle('is-dimmed', selectedCategory !== 'all' && skill.dataset.category !== selectedCategory);
    });
  }
}

function initProjects() {
  const container = document.querySelector('[data-projects]');
  if (!container) return;
  const panels = [...container.querySelectorAll('[data-project]')];
  const selectors = [...document.querySelectorAll('[data-select-project]')];
  const steppers = [...document.querySelectorAll('[data-project-step]')];
  if (!panels.length) return;
  let selected = panels[0];
  let changing = false;
  const getPanel = id => panels.find(panel => panel.dataset.project === id);
  container.classList.add('is-enhanced');
  for (const control of [...selectors, ...steppers]) control.hidden = false;
  function recordSelection(panel, method = 'pushState') {
    const caseStudy = panel.querySelector('[data-case-study]');
    const state = { ...history.state, portfolioProject: { id: panel.dataset.project, expanded: Boolean(caseStudy?.open) } };
    history[method](state, '', `#${panel.id}`);
  }
  function selectProject(panel, { historyUpdate = false, reveal = false, scroll = false } = {}) {
    if (!panel) return;
    changing = true;
    selected = panel;
    // Cropped images can have their own box above the viewport; selecting a
    // panel must load its capture even when the lazy-loading heuristic defers it.
    for (const image of panel.querySelectorAll('.capture img')) image.loading = 'eager';
    const index = panels.indexOf(panel);
    panels.forEach((item, itemIndex) => {
      const order = (itemIndex - index + panels.length) % panels.length;
      const active = item === panel;
      item.classList.toggle('is-active', active);
      item.classList.toggle('is-neighbor', !active && order <= 2);
      item.style.setProperty('--project-order', String(order));
      item.open = active;
      const summary = item.querySelector('[data-project-summary]');
      summary?.setAttribute('aria-expanded', String(active));
    });
    for (const selector of selectors) {
      const active = selector.dataset.selectProject === panel.dataset.project;
      selector.classList.toggle('is-selected', active);
      selector.setAttribute('aria-pressed', String(active));
    }
    if (reveal) {
      const caseStudy = panel.querySelector('[data-case-study]');
      if (caseStudy) caseStudy.open = true;
    }
    if (historyUpdate) recordSelection(panel);
    changing = false;
    if (scroll) requestAnimationFrame(() => panel.scrollIntoView({ block: 'start', behavior: scrollBehavior() }));
  }
  for (const panel of panels) {
    panel.querySelector('[data-project-summary]')?.addEventListener('click', event => {
      event.preventDefault();
      selectProject(panel, { historyUpdate: true });
    });
    panel.querySelector('[data-case-study]')?.addEventListener('toggle', () => {
      if (!changing && selected === panel && location.hash === `#${panel.id}`) recordSelection(panel, 'replaceState');
    });
  }
  for (const selector of selectors) selector.addEventListener('click', () => selectProject(getPanel(selector.dataset.selectProject), { historyUpdate: true }));
  for (const trigger of container.querySelectorAll('[data-read-case]')) trigger.addEventListener('click', event => {
    const panel = getPanel(trigger.dataset.readCase);
    if (!panel) return;
    event.preventDefault();
    selectProject(panel, { reveal: true, historyUpdate: true });
    const caseStudy = panel.querySelector('[data-case-study]');
    requestAnimationFrame(() => {
      caseStudy?.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
      caseStudy?.querySelector('summary')?.focus({ preventScroll: true });
    });
  });
  for (const control of steppers) control.addEventListener('click', () => {
    const index = panels.indexOf(selected);
    const step = Number(control.dataset.projectStep) || 1;
    selectProject(panels[(index + step + panels.length) % panels.length], { historyUpdate: true });
  });
  function restoreFromLocation(scroll = true) {
    let fragment;
    try { fragment = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const panel = panels.find(item => item.id === fragment || item.querySelector('[data-case-study]')?.id === fragment);
    if (panel) {
      const saved = history.state?.portfolioProject;
      const caseStudy = panel.querySelector('[data-case-study]');
      const caseFragment = caseStudy?.id === fragment;
      const expanded = caseFragment || (saved?.id === panel.dataset.project ? saved.expanded : true);
      if (caseStudy) caseStudy.open = Boolean(expanded);
      selectProject(panel, { reveal: Boolean(expanded), scroll: scroll && !caseFragment });
      if (scroll && caseFragment) requestAnimationFrame(() => caseStudy.scrollIntoView({ block: 'start', behavior: scrollBehavior() }));
    } else if (history.state?.portfolioProject?.id) {
      selectProject(getPanel(history.state.portfolioProject.id));
    } else {
      selectProject(panels[0]);
    }
  }
  window.addEventListener('popstate', () => restoreFromLocation());
  window.addEventListener('hashchange', () => restoreFromLocation());
  restoreFromLocation(false);
  if (/^#(?:project|case)-/.test(location.hash)) requestAnimationFrame(() => requestAnimationFrame(() => restoreFromLocation(true)));
}

function initLightbox() {
  const dialog = document.querySelector('[data-lightbox]');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const title = dialog.querySelector('[data-lightbox-title]');
  const media = dialog.querySelector('[data-lightbox-media]');
  if (!media) return;
  let opener;
  for (const button of document.querySelectorAll('[data-enlarge]')) {
    button.hidden = false;
    button.addEventListener('click', () => {
      const panel = button.closest('[data-project]');
      const source = panel?.querySelector('.capture');
      if (!source) return;
      const capture = source.cloneNode(true);
      capture.removeAttribute('id');
      for (const element of capture.querySelectorAll('[id]')) element.removeAttribute('id');
      for (const img of capture.querySelectorAll('img')) img.loading = 'eager';
      media.replaceChildren(capture);
      const projectTitle = panel.dataset.title || panel.querySelector('h3')?.textContent || 'Project';
      if (title) title.textContent = `${projectTitle.trim()} — original screenshot`;
      opener = button;
      dialog.showModal();
      document.body.classList.add('no-scroll');
    });
  }
  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('no-scroll');
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
}

function initCopyEmail() {
  const button = document.querySelector('[data-copy-email]');
  if (!button || !navigator.clipboard || !window.isSecureContext) return;
  const status = document.querySelector('[data-copy-status]');
  const label = button.querySelector('[data-copy-label]') || button.querySelector('span');
  const originalLabel = label?.textContent || 'Copy email';
  let restoreTimer;
  button.hidden = false;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copyEmail || '');
      if (status) status.textContent = 'Email address copied.';
      if (label) label.textContent = 'Copied';
    } catch {
      if (status) status.textContent = 'Could not copy. Select the email address or use the email link.';
    }
    clearTimeout(restoreTimer);
    restoreTimer = setTimeout(() => { if (label) label.textContent = originalLabel; }, 2500);
  });
}

function initHighlights() {
  const section = document.querySelector('[data-highlights]');
  const sticky = section?.querySelector('[data-highlight-sticky]');
  const track = section?.querySelector('[data-highlight-track]');
  if (!section || !sticky || !track) return;
  const cards = [...track.querySelectorAll('[data-highlight-card]')];
  const previous = section.querySelector('[data-highlight-prev]');
  const next = section.querySelector('[data-highlight-next]');
  const progress = section.querySelector('[data-highlight-progress]');
  let linked = false;
  let distance = 0;
  let stickyTop = 96;
  let paddingTop = 0;
  let paddingBottom = 0;
  let scrollFrame = 0;
  let measureFrame = 0;
  let position = 0;
  function renderProgress(value) {
    const ratio = distance > 0 ? clamp(value / distance) : 0;
    position = clamp(value, 0, distance);
    if (progress) {
      progress.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
      progress.style.setProperty('--progress', `${ratio * 100}%`);
      const fill = progress.querySelector('[data-highlight-progress-fill]');
      if (fill) fill.style.width = `${ratio * 100}%`;
    }
    if (previous) previous.disabled = position <= 1;
    if (next) next.disabled = distance <= 0 || position >= distance - 1;
  }
  function startPosition() { return section.getBoundingClientRect().top + window.scrollY + paddingTop - stickyTop; }
  function updateScroll() {
    scrollFrame = 0;
    if (linked) {
      const offset = clamp(window.scrollY - startPosition(), 0, distance);
      track.style.transform = `translate3d(${-offset}px,0,0)`;
      renderProgress(offset);
    } else renderProgress(track.scrollLeft);
  }
  const requestScroll = () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  };
  function measure() {
    measureFrame = 0;
    distance = Math.max(0, track.scrollWidth - track.clientWidth);
    const sectionStyle = getComputedStyle(section);
    stickyTop = Number.parseFloat(sectionStyle.getPropertyValue('--highlight-top')) || 96;
    paddingTop = Number.parseFloat(sectionStyle.paddingTop) || 0;
    paddingBottom = Number.parseFloat(sectionStyle.paddingBottom) || 0;
    const shouldLink = desktopQuery.matches && !motionQuery.matches && distance > 1 && sticky.offsetHeight + stickyTop < window.innerHeight;
    const changed = linked !== shouldLink;
    linked = shouldLink;
    section.classList.toggle('is-scroll-linked', linked);
    if (linked) {
      if (changed) track.scrollLeft = 0;
      const height = sticky.offsetHeight + distance + paddingTop + paddingBottom;
      section.style.setProperty('--highlight-distance', `${distance}px`);
      section.style.setProperty('--highlight-height', `${height}px`);
      section.style.height = `${height}px`;
      sticky.style.position = 'sticky';
      sticky.style.top = `${stickyTop}px`;
    } else {
      section.style.removeProperty('height');
      section.style.removeProperty('--highlight-distance');
      section.style.removeProperty('--highlight-height');
      sticky.style.removeProperty('position');
      sticky.style.removeProperty('top');
      track.style.removeProperty('transform');
    }
    for (const control of [previous, next]) if (control) control.hidden = distance <= 1;
    updateScroll();
  }
  const requestMeasure = () => {
    if (!measureFrame) measureFrame = requestAnimationFrame(measure);
  };
  function move(direction) {
    const first = cards[0]?.offsetLeft || 0;
    const offsets = [...new Set(cards.map(card => clamp(card.offsetLeft - first, 0, distance)))];
    const target = direction > 0 ? offsets.find(offset => offset > position + 2) ?? distance : offsets.findLast(offset => offset < position - 2) ?? 0;
    if (linked) window.scrollTo({ top: startPosition() + target, behavior: scrollBehavior() });
    else track.scrollTo({ left: target, behavior: scrollBehavior() });
  }
  previous?.addEventListener('click', () => move(-1));
  next?.addEventListener('click', () => move(1));
  window.addEventListener('scroll', requestScroll, { passive: true });
  track.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', requestMeasure, { passive: true });
  motionQuery.addEventListener('change', requestMeasure);
  desktopQuery.addEventListener('change', requestMeasure);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(requestMeasure);
    observer.observe(sticky);
    observer.observe(track);
  }
  document.fonts?.ready.then(requestMeasure);
  measure();
}

function initCounters() {
  const counters = [...document.querySelectorAll('[data-count-to]')];
  const running = new Set();
  function animate(counter) {
    const value = Number(counter.dataset.countTo);
    const display = counter.querySelector('[data-count-display]') || counter;
    if (!Number.isFinite(value)) return;
    const prefix = counter.dataset.countPrefix || counter.dataset.prefix || '';
    const suffix = counter.dataset.countSuffix || counter.dataset.suffix || '';
    const decimals = Math.min(3, Math.max(0, Number(counter.dataset.countDecimals) || (String(value).split('.')[1]?.length || 0)));
    const formatter = new Intl.NumberFormat('en', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
    const format = number => `${prefix}${formatter.format(number)}${suffix}`;
    counter.setAttribute('aria-label', format(value));
    if (display !== counter) display.setAttribute('aria-hidden', 'true');
    if (motionQuery.matches) { display.textContent = format(value); return; }
    const animation = { display, value, format, frame: 0 };
    running.add(animation);
    const start = performance.now();
    function tick(now) {
      const elapsed = clamp((now - start) / 1100);
      const eased = 1 - (1 - elapsed) ** 3;
      display.textContent = format(decimals ? value * eased : Math.round(value * eased));
      if (elapsed < 1 && !motionQuery.matches) animation.frame = requestAnimationFrame(tick);
      else { display.textContent = format(value); running.delete(animation); }
    }
    animation.frame = requestAnimationFrame(tick);
  }
  motionQuery.addEventListener('change', () => {
    if (!motionQuery.matches) return;
    for (const item of running) {
      cancelAnimationFrame(item.frame);
      item.display.textContent = item.format(item.value);
    }
    running.clear();
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { observer.unobserve(entry.target); animate(entry.target); }
    }, { threshold: 0.3 });
    for (const counter of counters) observer.observe(counter);
  } else for (const counter of counters) animate(counter);
}

initNavigation();
initBadges();
initSkills();
initProjects();
initLightbox();
initCopyEmail();
initContactForm();
initHighlights();
initCounters();

// Keep the portrait visible while the optional 3D enhancement loads.
if (document.querySelector('[data-hero-avatar]')) {
  const loadAvatar = () => import('./hero-avatar.js').then(module => module.initHeroAvatar()).catch(() => {});
  requestAnimationFrame(() => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(loadAvatar, { timeout: 1500 });
    else setTimeout(loadAvatar, 200);
  });
}
