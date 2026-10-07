import test from 'node:test';
import assert from 'node:assert/strict';
import { attachmentError, MAX_FILES, MAX_TOTAL_BYTES, sendContactMessage } from '../src/contact-form.js';
import { getContent, validateContent } from '../src/content.mjs';
import { renderPortfolio } from '../src/render.mjs';

test('attachment limits handle total size and file count including boundaries', () => {
  assert.equal(attachmentError([]), '');
  assert.equal(attachmentError([{ size: MAX_TOTAL_BYTES }]), '');
  assert.match(attachmentError([{ size: MAX_TOTAL_BYTES - 1 }, { size: 2 }]), /10 MB/);
  assert.equal(attachmentError(Array.from({ length: MAX_FILES }, () => ({ size: 1 }))), '');
  assert.match(attachmentError(Array.from({ length: MAX_FILES + 1 }, () => ({ size: 1 }))), /5 attachments/);
});

test('unconfigured contact does not transmit data or claim to be connected', async () => {
  let calls = 0;
  await assert.rejects(sendContactMessage('', new FormData(), { fetcher: () => { calls++; } }), /not connected/);
  assert.equal(calls, 0);
  const data = getContent();
  data.contact.formEndpoint = '';
  data.contact.formEmbedUrl = '';
  const html = renderPortfolio(data);
  assert.match(html, /data-contact-send disabled/);
  assert.match(html, /This form has not sent anything/);
  assert.match(html, /type="file" multiple/);
  assert.match(html, /name="message"/);
});

test('multipart submission retains Unicode, reply email, and multiple original files', async () => {
  const data = new FormData();
  data.set('email', 'visitor@example.com');
  data.set('subject', 'Design & development — café');
  data.set('message', 'Line one\nLine two');
  data.append('attachment', new Blob(['brief'], { type: 'text/plain' }), 'brief.txt');
  data.append('attachment', new Blob(['reference'], { type: 'text/plain' }), 'reference.txt');
  let calls = 0;
  await sendContactMessage('https://formspree.io/f/test-fixture', data, {
    fetcher: async (url, options) => {
      calls++;
      assert.equal(url, 'https://formspree.io/f/test-fixture');
      assert.equal(options.method, 'POST');
      assert.equal(options.credentials, 'omit');
      assert.equal(options.body, data);
      assert.equal(options.headers['Content-Type'], undefined, 'Browser must generate the multipart boundary.');
      assert.equal(data.get('subject'), 'Design & development — café');
      assert.deepEqual(data.getAll('attachment').map(file => file.name), ['brief.txt', 'reference.txt']);
      return Response.json({ ok: true });
    },
  });
  assert.equal(calls, 1);
});

test('HTTP success without an explicit acceptance response is never treated as sent', async () => {
  for (const response of [new Response('<html>Sign in</html>'), Response.json({}), Response.json({ ok: false }), Response.json({ ok: true }, { status: 500 })]) {
    await assert.rejects(sendContactMessage('https://formspree.io/f/test-fixture', new FormData(), { fetcher: async () => response }), /did not confirm/);
  }
});

test('delivery failures do not silently retry', async () => {
  for (const [status, text] of [[429, /Too many/], [413, /attachments/], [422, /did not confirm/]]) {
    let calls = 0;
    await assert.rejects(sendContactMessage('https://formspree.io/f/test-fixture', new FormData(), {
      fetcher: async () => { calls++; return Response.json({ errors: [{ message: 'Rejected' }] }, { status }); },
    }), text);
    assert.equal(calls, 1);
  }
  const networkError = new TypeError('Network unavailable');
  await assert.rejects(sendContactMessage('https://formspree.io/f/test-fixture', new FormData(), { fetcher: async () => { throw networkError; } }), error => error === networkError);
});

test('hosted contact forms load on demand and delivery configuration is validated', async () => {
  const data = getContent();
  data.contact.formEmbedUrl = 'https://forms.zohopublic.com/example/form/Contact/formperma/test';
  await validateContent(data);
  const html = renderPortfolio(data);
  assert.match(html, /data-contact-embed data-src="https:\/\/forms\.zohopublic\.com/);
  assert.doesNotMatch(html, /<iframe[^>]*\ssrc=/);
  assert.match(html, /<form[^>]* hidden>/);
  assert.match(html, /href="https:\/\/forms\.zohopublic\.com\/example\/form\/Contact\/formperma\/test" data-contact-fallback>Open contact form/);
  assert.doesNotMatch(html, /Direct sending is being connected/);
  data.contact.formEndpoint = 'https://formspree.io/f/test-fixture';
  await assert.rejects(validateContent(data), /not both/);
  data.contact.formEmbedUrl = '';
  for (const endpoint of ['http://example.com/form', 'https://user:secret@example.com/form', 'javascript:alert(1)', '/api/contact']) {
    data.contact.formEndpoint = endpoint;
    await assert.rejects(validateContent(data), /public HTTPS/);
  }
});
