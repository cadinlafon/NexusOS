// Checks every configured NEXUS AI capability with one small, real request
// through the local NEXUS AI service. Run it while NEXUS is running:
//
//   npm run ai:test
//
// It makes about a dozen requests. OpenRouter gives an account without credits
// only 50 free requests a day, shared by every free model, so do not run this
// in a loop.
//
// It also checks the two things that must never happen: a paid model being
// used, and a model outside ai/models.json being accepted.

import { readFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BASE = process.env.NEXUS_URL ?? 'http://localhost:5173'
const config = JSON.parse(readFileSync(new URL('../ai/models.json', import.meta.url), 'utf8'))
const names = new Map(Object.values(config.capabilities).flatMap((c) => c.models.map((m) => [m.id, m.name])))

let failed = 0
const report = (ok, capability, detail) => {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${capability.padEnd(16)} ${detail}`)
}
const using = (id) => `Using ${names.get(id) ?? id}${String(id).endsWith(':free') ? '' : '  <-- NOT A FREE ID'}`
const isFree = (id) => String(id).endsWith(':free') && names.has(id)

const post = (path, body) =>
  fetch(`${BASE}/__ai/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

/** A small solid red PNG, made here so the image test sends a real picture. */
function redPng() {
  const size = 64
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3, 0).map((_, i) => (i % 3 === 0 ? 220 : 30))])
  const table = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (buffer) => (buffer.reduce((c, byte) => table[(c ^ byte) & 0xff] ^ (c >>> 8), 0xffffffff) ^ 0xffffffff) >>> 0
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data])
    const out = Buffer.alloc(body.length + 8)
    out.writeUInt32BE(data.length, 0)
    body.copy(out, 4)
    out.writeUInt32BE(crc(body), body.length + 4)
    return out
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header.set([8, 2, 0, 0, 0], 8)
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(Array(size).fill(row)))),
    chunk('IEND', Buffer.alloc(0)),
  ])
  return `data:image/png;base64,${png.toString('base64')}`
}

async function chat(capability, extra = {}, content = 'Reply with exactly: OK') {
  const response = await post('chat', { capability, messages: [{ role: 'user', content }], ...extra })
  if (!response.ok) return { error: (await response.json()).error?.code }
  const model = response.headers.get('x-nexus-model')
  const stream = await response.text()
  const text = [...stream.matchAll(/^data: (\{.*\})$/gm)].map((m) => JSON.parse(m[1]).choices?.[0]?.delta?.content ?? '').join('')
  return { model, text: text.trim() }
}

const json = async (path, body) => {
  const response = await post(path, body)
  return response.ok ? response.json() : { error: (await response.json()).error?.code }
}

const status = await fetch(`${BASE}/__ai/status`).then((r) => r.json()).catch(() => null)
if (!status) {
  console.error(`NEXUS is not running at ${BASE}. Start it with npm run dev:local (or npm run dev) first.`)
  process.exit(1)
}
if (!status.configured) {
  console.error('No OpenRouter key was found. Add OPENROUTER_API_KEY to .env.local (or .env).')
  process.exit(1)
}

for (const capability of ['chat', 'coding', 'longContext']) {
  const r = await chat(capability)
  report(!r.error && isFree(r.model) && r.text.length > 0, capability, r.error ? `error: ${r.error}` : `replied "${r.text.slice(0, 20)}". ${using(r.model)}`)
}
{
  // The image model is sent a real picture: a plain red square.
  const r = await chat('image', {}, [
    { type: 'text', text: 'What single colour fills this picture? One word.' },
    { type: 'image_url', image_url: { url: redPng() } },
  ])
  report(!r.error && isFree(r.model) && /red/i.test(r.text), 'image', r.error ? `error: ${r.error}` : `saw "${r.text.slice(0, 20)}" in a red square. ${using(r.model)}`)
}

{
  const r = await json('decisions', {
    state: 'A homework task is due tomorrow and nobody has started it.',
    questions: { late: { type: 'noul', instructions: 'The work is at risk of being late' } },
  })
  report(!r.error && isFree(r.model) && typeof r.answers?.late?.noul === 'number', 'decisions', r.error ? `error: ${r.error}` : `yes ${Math.round(r.answers.late.noul * 100)}%. ${using(r.model)}`)
}
{
  const r = await json('embeddings', { input: ['Plants make food from sunlight.', 'Photosynthesis'] })
  const expected = config.capabilities.embeddings.dimensions
  report(!r.error && isFree(r.model) && r.dimensions === expected, 'embeddings', r.error ? `error: ${r.error}` : `${r.embeddings.length} vectors of ${r.dimensions} (expected ${expected}). ${using(r.model)}`)
}
{
  const r = await json('rerank', { query: 'How do plants make food?', documents: ['The French Revolution began in 1789.', 'Photosynthesis turns light into glucose.'] })
  const best = r.results && [...r.results].sort((a, b) => b.score - a.score)[0]
  report(!r.error && isFree(r.model) && best?.index === 1, 'rerank', r.error ? `error: ${r.error}` : `ranked document ${best?.index} first (expected 1). ${using(r.model)}`)
}
{
  const response = await post('speech', { input: 'NEXUS voice test.' })
  const model = response.headers.get('x-nexus-model')
  const bytes = response.ok ? (await response.arrayBuffer()).byteLength : 0
  report(response.ok && isFree(model) && bytes > 1000, 'voice', response.ok ? `${Math.round(bytes / 1024)} KB of ${response.headers.get('content-type')}. ${using(model)}` : `error: ${(await response.json()).error?.code}`)
}

for (const [id, capability] of Object.entries(config.capabilities)) {
  if (capability.models.length === 0) report(true, id, `unavailable, as configured: ${capability.unavailable}`)
}

console.log('\nGuards')
{
  // A paid model named by the page must be ignored, not used.
  const r = await chat('chat', { model: 'openai/gpt-4o' })
  report(!r.error && isFree(r.model), 'paid model asked', r.error ? `error: ${r.error}` : `ignored. ${using(r.model)}`)
}
{
  const r = await chat('video')
  report(r.error === 'not_configured', 'unavailable asked', `answered: ${r.error ?? 'a reply (wrong)'}`)
}
{
  const r = await json('decisions', { state: 'x', questions: { a: { type: 'score', instructions: 'x', criteria: ['a'] } } })
  report(r.error === 'bad_request', 'bad request', `answered: ${r.error ?? 'a result (wrong)'}`)
}

console.log(failed ? `\n${failed} check(s) failed. "daily_limit" means today's free requests are used up; try again tomorrow.` : '\nAll checks passed. No paid model was used.')
process.exit(failed ? 1 : 0)
