/** Direct-send contact form. The public endpoint is supplied at build time. */
export const MAX_FILES = 5;
export const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

export function attachmentError(files) {
  if (files.length > MAX_FILES) return `Choose up to ${MAX_FILES} attachments.`;
  if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) return 'Attachments must total 10 MB or less.';
  return '';
}

export function validContactEndpoint(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash;
  } catch { return false; }
}

/** A successful HTTP response alone is not confirmation of message acceptance. */
export async function sendContactMessage(endpoint, data, { fetcher = fetch, signal } = {}) {
  if (!validContactEndpoint(endpoint)) throw new Error('Direct sending is not connected yet. Please use the email address below.');
  const response = await fetcher(endpoint, {
    method: 'POST', body: data, headers: { Accept: 'application/json' },
    credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', signal,
  });
  let result;
  try { result = await response.json(); } catch { /* An HTML error or redirect is not success. */ }
  if (response.ok && result?.ok === true) return;
  if (response.status === 429) throw new Error('Too many messages right now. Please wait before trying again. Your draft is still here.');
  if (response.status === 413) throw new Error('The email service could not accept these attachments. Try smaller files. Your draft is still here.');
  if (result?.errors?.some(error => /captcha/i.test(String(error.code || '') + String(error.field || '')))) {
    throw new Error('The email service requires a verification step. Please use the email address below for now. Your draft is still here.');
  }
  throw new Error('The email service did not confirm your message. Your draft is still here; please try again later or use the email address below.');
}

export function initContactForm(root = document) {
  const dialog = root.querySelector('[data-contact-dialog]');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const form = dialog.querySelector('form');
  const fieldset = form.querySelector('fieldset');
  const input = form.querySelector('[type="file"]');
  const fileList = form.querySelector('[data-contact-files]');
  const fileError = form.querySelector('[data-file-error]');
  const status = dialog.querySelector('[data-contact-status]');
  const send = form.querySelector('[data-contact-send]');
  const endpoint = form.dataset.endpoint || '';
  const hostedForm = dialog.querySelector('[data-contact-embed]');
  const configured = validContactEndpoint(endpoint);
  let files = [];
  let sending = false;
  let opener;

  function announce(message, error = false) {
    status.textContent = message;
    status.classList.toggle('is-error', error);
  }

  function renderFiles() {
    fileList.replaceChildren();
    for (const [index, file] of files.entries()) {
      const row = document.createElement('li');
      const label = document.createElement('span');
      const size = file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.ceil(file.size / 1024))} KB`;
      label.textContent = `${file.name} · ${size}`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.setAttribute('aria-label', `Remove attachment ${file.name}`);
      remove.addEventListener('click', () => {
        files.splice(index, 1);
        renderFiles();
        fileError.textContent = '';
        input.focus();
      });
      row.append(label, remove);
      fileList.append(row);
    }
  }

  for (const button of root.querySelectorAll('[data-open-contact]')) {
    button.hidden = false;
    button.addEventListener('click', event => {
      event.preventDefault();
      opener = button;
      dialog.showModal();
      document.body.classList.add('no-scroll');
      if (hostedForm) {
        // Load only after the visitor opens the composer; keep it alive on close.
        if (!hostedForm.hasAttribute('src')) hostedForm.src = hostedForm.dataset.src;
        dialog.querySelector('[data-contact-close]').focus({ preventScroll: true });
      } else if (!sending) form.elements.namedItem('name')?.focus({ preventScroll: true });
    });
  }
  for (const fallback of root.querySelectorAll('[data-contact-fallback]')) fallback.hidden = true;
  dialog.querySelector('[data-contact-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('no-scroll');
    opener?.focus({ preventScroll: true });
  });
  // Closing the dialog keeps the in-memory draft and any pending request intact.
  // Nothing is saved to localStorage or uploaded while choosing files.
  input.addEventListener('change', () => {
    const added = [...input.files].filter(file => !files.some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified));
    const candidate = [...files, ...added];
    const error = attachmentError(candidate);
    fileError.textContent = error;
    if (!error) { files = candidate; renderFiles(); }
    input.value = '';
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    if (!configured) { announce('Direct sending is not connected yet. Please use the email address below.', true); return; }
    for (const name of ['email', 'subject', 'message']) {
      const field = form.elements.namedItem(name);
      field.setCustomValidity(field.value.trim() ? '' : 'Please complete this field.');
    }
    if (!form.reportValidity()) return;
    const error = attachmentError(files);
    if (error) { fileError.textContent = error; input.focus(); return; }
    const data = new FormData(form);
    data.delete('attachment');
    for (const name of ['name', 'email', 'subject', 'message']) data.set(name, String(data.get(name) || '').trim());
    for (const file of files) data.append('attachment', file, file.name);
    sending = true;
    fieldset.disabled = true;
    send.disabled = true;
    send.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    announce('Sending your message…');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      await sendContactMessage(endpoint, data, { signal: controller.signal });
      form.reset();
      files = [];
      renderFiles();
      fileError.textContent = '';
      announce('Your message was accepted. Thank you for getting in touch.');
    } catch (error) {
      const message = error.name === 'AbortError' || error instanceof TypeError
        ? 'Delivery could not be confirmed. Your draft is still here. Wait before trying again to avoid a duplicate message.'
        : error.message;
      announce(message, true);
    } finally {
      clearTimeout(timeout);
      sending = false;
      fieldset.disabled = false;
      send.disabled = !configured;
      send.textContent = 'Send message';
      form.removeAttribute('aria-busy');
    }
  });
  form.addEventListener('input', event => {
    if (typeof event.target.setCustomValidity === 'function') event.target.setCustomValidity('');
    if (!sending) announce('');
  });
  send.disabled = !configured;
}
