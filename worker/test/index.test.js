// Run with `node --test worker/` (Node 22). No Cloudflare runtime needed: the
// Worker uses only fetch, Request and Response, which Node provides.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker, { formatPush, clipBytes, PUSH_BYTES } from '../src/index.js';

const ORIGIN = 'https://site.example';
const env = {
  ALLOWED_ORIGINS: `${ORIGIN}, https://other.example`,
  TURNSTILE_SECRET: 'secret',
  TELEGRAM_BOT_TOKEN: '123:abc',
  TELEGRAM_CHAT_ID: '42',
};

let calls;
let turnstileOk;
let sendOk;
let solvedOn;
const realFetch = globalThis.fetch;

beforeEach(() => {
  calls = [];
  turnstileOk = true;
  sendOk = true;
  solvedOn = 'site.example';
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('siteverify')) {
      return Response.json({ success: turnstileOk, hostname: solvedOn });
    }
    return new Response('{}', { status: sendOk ? 200 : 500 });
  };
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

function post(fields, { origin = ORIGIN, headers = {} } = {}) {
  const body = new URLSearchParams({
    topic: 'general',
    message: 'Hello there',
    'cf-turnstile-response': 'tok',
    ...fields,
  });
  return new Request('https://worker.example/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(origin ? { Origin: origin } : {}),
      'CF-Connecting-IP': '203.0.113.9',
      ...headers,
    },
    body,
  });
}

async function send(request, e = env) {
  const res = await worker.fetch(request, e);
  return { res, body: res.status === 204 ? null : await res.json() };
}

test('a valid message is verified and pushed', async () => {
  const { res, body } = await send(post({ name: 'Ann', email: 'ann@example.com' }));
  assert.equal(res.status, 200);
  assert.deepEqual(body, { ok: true });
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.equal(calls.length, 2);
  const verify = calls[0].init.body;
  assert.equal(verify.get('secret'), 'secret');
  assert.equal(verify.get('response'), 'tok');
  assert.equal(verify.get('remoteip'), '203.0.113.9');
  assert.equal(calls[1].url, 'https://api.telegram.org/bot123:abc/sendMessage');
  const push = JSON.parse(calls[1].init.body);
  assert.equal(push.chat_id, '42');
  assert.equal(push.parse_mode, undefined);
  assert.equal(push.text, 'Website: General\nFrom Ann <ann@example.com>\n\nHello there');
});

test('project feedback names the project, and requires one', async () => {
  const { res } = await send(post({ topic: 'feedback', project: 'Sparring' }));
  assert.equal(res.status, 200);
  assert.match(JSON.parse(calls[1].init.body).text, /^Website: Feedback: Sparring\n/);

  calls = [];
  const missing = await send(post({ topic: 'feedback' }));
  assert.equal(missing.res.status, 400);
  assert.equal(calls.length, 0);
});

test('JSON bodies are accepted too', async () => {
  const req = new Request('https://worker.example/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ topic: 'work', message: 'Hi', 'cf-turnstile-response': 't' }),
  });
  const { res } = await send(req);
  assert.equal(res.status, 200);
});

test('a foreign or missing origin is refused before any outbound call', async () => {
  for (const origin of ['https://evil.example', null]) {
    const { res } = await send(post({}, { origin }));
    assert.equal(res.status, 403);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
  }
  assert.equal(calls.length, 0);
});

test('preflight is answered for allowed origins only', async () => {
  const ok = await worker.fetch(
    new Request('https://worker.example/', { method: 'OPTIONS', headers: { Origin: ORIGIN } }),
    env,
  );
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  const no = await worker.fetch(
    new Request('https://worker.example/', { method: 'OPTIONS', headers: { Origin: 'https://x.example' } }),
    env,
  );
  assert.equal(no.status, 403);
});

test('other methods are refused', async () => {
  const res = await worker.fetch(new Request('https://worker.example/', { headers: { Origin: ORIGIN } }), env);
  assert.equal(res.status, 405);
});

test('invalid fields are rejected without calling Turnstile', async () => {
  const cases = [
    { topic: 'spam' },
    { message: '' },
    { message: '   ' },
    { message: 'x'.repeat(4001) },
    { name: 'n'.repeat(101) },
    { email: 'not-an-email' },
    { email: `${'e'.repeat(195)}@x.com` },
    { project: 'p'.repeat(81) },
    { 'cf-turnstile-response': '' },
  ];
  for (const fields of cases) {
    const { res, body } = await send(post(fields));
    assert.equal(res.status, 400, JSON.stringify(fields));
    assert.equal(body.ok, false);
    assert.ok(body.error);
  }
  assert.equal(calls.length, 0);
});

test('an oversized body is refused', async () => {
  const { res } = await send(post({ message: 'x'.repeat(17 * 1024) }));
  assert.equal(res.status, 413);
  assert.equal(calls.length, 0);
});

test('the honeypot gets a quiet success and sends nothing', async () => {
  const { res, body } = await send(post({ hp_x7: 'http://spam.example' }));
  assert.equal(res.status, 200);
  assert.deepEqual(body, { ok: true });
  assert.equal(calls.length, 0);
});

test('a failed Turnstile check sends nothing', async () => {
  turnstileOk = false;
  const { res } = await send(post({}));
  assert.equal(res.status, 403);
  assert.equal(calls.length, 1);
});

test('a Telegram failure is reported as 502', async () => {
  sendOk = false;
  const { res } = await send(post({}));
  assert.equal(res.status, 502);
});

test('the rate limiter is keyed by client IP and enforced', async () => {
  const keys = [];
  const limited = { ...env, LIMITER: { limit: async ({ key }) => (keys.push(key), { success: false }) } };
  const { res } = await send(post({}), limited);
  assert.equal(res.status, 429);
  assert.deepEqual(keys, ['203.0.113.9']);
  assert.equal(calls.length, 0);
});

test('missing secrets fail closed', async () => {
  const { res } = await send(post({}), { ...env, TELEGRAM_CHAT_ID: '' });
  assert.equal(res.status, 500);
  assert.equal(calls.length, 0);
});

test('anonymous messages say so', () => {
  const push = formatPush({ topic: 'other', project: '', message: 'm', name: '', email: '' });
  assert.equal(push, 'Website: Other\nFrom Anonymous\n\nm');
});

test('a token solved on another hostname is refused', async () => {
  solvedOn = 'localhost';
  const { res } = await send(post({}));
  assert.equal(res.status, 403);
  assert.equal(calls.length, 1);
});

test('a chunked body over the cap is refused without a Content-Length', async () => {
  const big = new TextEncoder().encode('message=' + 'x'.repeat(20 * 1024));
  const stream = new ReadableStream({
    start(c) {
      for (let i = 0; i < big.length; i += 1024) c.enqueue(big.slice(i, i + 1024));
      c.close();
    },
  });
  const req = new Request('https://worker.example/', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: stream,
    duplex: 'half',
  });
  assert.equal(req.headers.get('Content-Length'), null);
  const { res } = await send(req);
  assert.equal(res.status, 413);
  assert.equal(calls.length, 0);
});

test('long or non-ASCII messages stay under the Telegram limit', () => {
  const push = formatPush({
    topic: 'general', project: '', name: 'n'.repeat(100), email: `${'e'.repeat(190)}@x.com`,
    message: 'नमस्ते '.repeat(600),
  });
  const bytes = new TextEncoder().encode(push).byteLength;
  assert.ok(bytes <= PUSH_BYTES, String(bytes));
  assert.ok(push.endsWith('(truncated)'));
  assert.equal(clipBytes('short', PUSH_BYTES), 'short');
  assert.ok(!clipBytes('é'.repeat(3000), 101).includes('\uFFFD'));
});
