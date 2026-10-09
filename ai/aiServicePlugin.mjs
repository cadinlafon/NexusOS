// NEXUS AI service — the development stand-in.
//
// A small Vite plugin that runs inside the NEXUS dev server and forwards
// NEXUS AI requests to OpenRouter:
//
//   NEXUS AI  →  /__ai (this file)  →  OpenRouter  →  a free model
//
// Two things are decided here and nowhere else:
//
// 1. The key. It is read from .env / .env.local and stays in this process. It
//    is never sent to the browser.
// 2. The model. A request names a capability ("chat", "coding", ...), never
//    just any model. The models for each capability come from ai/models.json,
//    and an id is refused unless it is in that file AND ends in ":free". There
//    is no path from a page to a paid model.
//
// This is not the production service. In a school it becomes an
// authenticated backend that knows who is asking, applies school policy and
// keeps the key on the school's servers. Here it only accepts requests from
// the page it serves, and it trusts that page.
//
// Nothing here logs a key, a message or a reply: only status codes and
// OpenRouter's short error text.

import { readFileSync } from 'node:fs'
import { loadEnv } from 'vite'

const API = 'https://openrouter.ai/api/v1'
const DECISIONS_API = 'https://openrouter.ai/api/alpha/decisions'
const CONFIG_FILE = new URL('./models.json', import.meta.url)

const MAX_BODY_BYTES = 400_000
const MAX_IMAGE_BODY_BYTES = 6_000_000
const MAX_MESSAGES = 80
const MAX_SPEECH_CHARACTERS = 600
const MAX_EMBED_INPUTS = 64
const CONNECT_TIMEOUT_MS = 45_000
const ROLES = new Set(['system', 'user', 'assistant'])

const readBody = (req, limit) =>
  new Promise((resolve) => {
    let raw = ''
    let tooLarge = false
    req.on('data', (chunk) => {
      if (tooLarge) return
      raw += chunk
      if (raw.length > limit) tooLarge = true
    })
    req.on('end', () => {
      if (tooLarge) return resolve(null)
      try {
        resolve(JSON.parse(raw || '{}'))
      } catch {
        resolve(null)
      }
    })
  })

const sendJSON = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

/** Only an error code goes back to the desktop; details stay in this terminal. */
const fail = (res, status, code) => sendJSON(res, status, { error: { code } })

const codeForStatus = (status) => {
  if (status === 401 || status === 403) return 'invalid_key'
  if (status === 402) return 'no_credits'
  if (status === 429) return 'rate_limit'
  if (status === 400 || status === 404) return 'model_unavailable'
  if (status === 408 || status === 504) return 'timeout'
  if (status >= 500) return 'provider_unavailable'
  return 'unknown'
}

/** A key or account-wide problem is the same for every model, so there is no point trying the next one. */
const worthTryingNext = (code) => !['invalid_key', 'no_credits', 'daily_limit'].includes(code)

const isText = (value) => typeof value === 'string'

/** A picture must arrive as data inside the request, never as a link for OpenRouter to fetch. */
const isImagePart = (part) =>
  part?.type === 'image_url' && isText(part.image_url?.url) && /^data:image\/(png|jpeg|webp);base64,/.test(part.image_url.url)

const validContent = (content, allowImages) =>
  isText(content) ||
  (allowImages &&
    Array.isArray(content) &&
    content.length > 0 &&
    content.every((part) => (part?.type === 'text' && isText(part.text)) || isImagePart(part)))

const validMessages = (messages, allowImages) =>
  Array.isArray(messages) &&
  messages.length > 0 &&
  messages.length <= MAX_MESSAGES &&
  messages.every((m) => m && ROLES.has(m.role) && validContent(m.content, allowImages && m.role === 'user'))

/** Raw 16-bit mono PCM, as the speech model returns it, wrapped as a WAV file a browser can play. */
function pcmToWav(pcm, sampleRate) {
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVEfmt ', 8)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

export function nexusAIService() {
  let apiKey = ''
  let config = { capabilities: {} }

  /** The free models configured for a capability, in the order to try them. */
  const modelsFor = (capability, endpoint) => {
    const entry = config.capabilities[capability]
    if (!entry || entry.endpoint !== endpoint) return []
    // The second half of the paid-model guard: whatever the file says, only ":free" ids are used.
    return (entry.models ?? []).filter((model) => isText(model.id) && model.id.endsWith(':free'))
  }

  const headers = () => ({
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'X-Title': 'NEXUS OS',
  })

  /**
   * Calls OpenRouter with each model in turn until one answers. Returns
   * { response, model } or { code } for the last failure.
   */
  const firstToAnswer = async (models, url, bodyFor, signal) => {
    let code = 'model_unavailable'
    for (const model of models) {
      try {
        const response = await fetch(url, { method: 'POST', signal, headers: headers(), body: JSON.stringify(bodyFor(model)) })
        if (response.ok && response.body) return { response, model }
        const detail = await response.text().catch(() => '')
        code = codeForStatus(response.status)
        // OpenRouter allows an account a fixed number of free requests a day,
        // shared by every free model. Once it is spent, nothing works until it resets.
        if (response.status === 429 && detail.includes('free-models-per-day')) code = 'daily_limit'
        console.warn(`[nexus-ai] ${model.id} answered ${response.status}: ${detail.slice(0, 200)}`)
      } catch (error) {
        if (signal?.aborted) throw error
        code = 'network'
        console.warn(`[nexus-ai] Could not reach OpenRouter for ${model.id}: ${error?.message}`)
      }
      if (!worthTryingNext(code)) break
    }
    return { code }
  }

  /** A JSON call (decisions, embeddings, rerank): fallback, timeout and one tidy reply. */
  const jsonCall = async (res, models, url, bodyFor, shape) => {
    if (models.length === 0) return fail(res, 400, 'not_configured')
    try {
      const { response, model, code } = await firstToAnswer(models, url, bodyFor, AbortSignal.timeout(CONNECT_TIMEOUT_MS))
      if (!response) return fail(res, 502, code)
      const data = await response.json()
      if (data?.error) {
        console.warn(`[nexus-ai] ${model.id} returned an error: ${String(data.error.message).slice(0, 200)}`)
        return fail(res, 502, 'provider_unavailable')
      }
      const result = shape(data)
      if (!result) return fail(res, 502, 'malformed')
      sendJSON(res, 200, { model: model.id, ...result })
    } catch (error) {
      console.warn(`[nexus-ai] ${error?.name === 'TimeoutError' ? 'OpenRouter did not answer in time' : `Request failed: ${error?.message}`}`)
      fail(res, 504, error?.name === 'TimeoutError' ? 'timeout' : 'network')
    }
  }

  /* ---------- Chat (chat, coding, long context, image) ---------- */

  const chat = async (req, res, body) => {
    const capability = isText(body.capability) ? body.capability : 'chat'
    const entry = config.capabilities[capability]
    let models = modelsFor(capability, 'chat')
    if (models.length === 0) return fail(res, 400, 'not_configured')
    if (!validMessages(body.messages, entry.acceptsImages === true)) return fail(res, 400, 'bad_request')

    // A desktop may prefer one of this capability's models. The others stay as fallbacks.
    if (isText(body.model)) {
      const preferred = models.find((model) => model.id === body.model)
      if (preferred) models = [preferred, ...models.filter((model) => model !== preferred)]
    }

    const upstream = new AbortController()
    const connectTimer = setTimeout(() => upstream.abort('timeout'), CONNECT_TIMEOUT_MS)
    // The person closed the window or pressed Stop.
    res.on('close', () => upstream.abort('closed'))

    try {
      const { response, model, code } = await firstToAnswer(
        models,
        `${API}/chat/completions`,
        (m) => ({ model: m.id, messages: body.messages, stream: true }),
        upstream.signal,
      )
      clearTimeout(connectTimer)
      if (!response) return fail(res, code === 'invalid_key' ? 401 : 502, code)

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
        // Which configured model is answering, so the label is right even before the first word.
        'X-Nexus-Model': model.id,
      })
      for await (const chunk of response.body) res.write(chunk)
      res.end()
    } catch (error) {
      clearTimeout(connectTimer)
      if (upstream.signal.reason === 'closed') return
      const timedOut = upstream.signal.reason === 'timeout'
      console.warn(`[nexus-ai] ${timedOut ? 'OpenRouter did not answer in time' : `Could not reach OpenRouter: ${error?.message}`}`)
      if (res.headersSent) return res.end()
      fail(res, 504, timedOut ? 'timeout' : 'network')
    }
  }

  /* ---------- Decisions ---------- */

  const decisions = (res, body) => {
    const questions = body.questions
    const valid =
      isText(body.state) &&
      body.state.length <= 8000 &&
      questions &&
      typeof questions === 'object' &&
      Object.keys(questions).length > 0 &&
      Object.keys(questions).length <= 12 &&
      Object.values(questions).every(
        (q) =>
          isText(q?.instructions) &&
          (q.type === 'noul' ||
            (q.type === 'choice' && q.criteria && Object.values(q.criteria).every(isText))),
      )
    if (!valid) return fail(res, 400, 'bad_request')

    // Some decision models only answer yes/no questions.
    const yesNoOnly = Object.values(questions).every((q) => q.type === 'noul')
    const models = modelsFor('decisions', 'decisions').filter((model) => yesNoOnly || !model.yesNoOnly)
    return jsonCall(
      res,
      models,
      DECISIONS_API,
      (model) => ({ model: model.id, state: body.state, questions }),
      (data) => (data.answers && typeof data.answers === 'object' ? { answers: data.answers } : null),
    )
  }

  /* ---------- Embeddings and reranking ---------- */

  const embeddings = (res, body) => {
    const input = body.input
    if (!Array.isArray(input) || input.length === 0 || input.length > MAX_EMBED_INPUTS || !input.every(isText)) {
      return fail(res, 400, 'bad_request')
    }
    return jsonCall(
      res,
      modelsFor('embeddings', 'embeddings'),
      `${API}/embeddings`,
      (model) => ({ model: model.id, input }),
      (data) => {
        const vectors = data.data?.map((item) => item.embedding)
        if (!Array.isArray(vectors) || vectors.length !== input.length || !vectors.every(Array.isArray)) return null
        return { dimensions: vectors[0].length, embeddings: vectors }
      },
    )
  }

  const rerank = (res, body) => {
    const documents = body.documents
    if (!isText(body.query) || !Array.isArray(documents) || documents.length === 0 || documents.length > MAX_EMBED_INPUTS || !documents.every(isText)) {
      return fail(res, 400, 'bad_request')
    }
    return jsonCall(
      res,
      modelsFor('rerank', 'rerank'),
      `${API}/rerank`,
      (model) => ({ model: model.id, query: body.query, documents }),
      (data) =>
        Array.isArray(data.results)
          ? { results: data.results.map((r) => ({ index: r.index, score: r.relevance_score })) }
          : null,
    )
  }

  /* ---------- Speech ---------- */

  const speech = async (res, body) => {
    const models = modelsFor('voice', 'speech')
    if (models.length === 0) return fail(res, 400, 'not_configured')
    if (!isText(body.input) || !body.input.trim() || body.input.length > MAX_SPEECH_CHARACTERS) return fail(res, 400, 'bad_request')
    try {
      const { response, model, code } = await firstToAnswer(
        models,
        `${API}/audio/speech`,
        (m) => ({ model: m.id, input: body.input }),
        AbortSignal.timeout(CONNECT_TIMEOUT_MS),
      )
      if (!response) return fail(res, 502, code)
      const type = response.headers.get('content-type') ?? ''
      const audio = Buffer.from(await response.arrayBuffer())
      // The model answers with raw PCM and says how fast to play it.
      const rate = Number(type.match(/rate=(\d+)/)?.[1])
      if (!type.startsWith('audio/pcm') || !rate || audio.length < 2) return fail(res, 502, 'malformed')
      res.writeHead(200, { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store', 'X-Nexus-Model': model.id })
      res.end(pcmToWav(audio, rate))
    } catch (error) {
      fail(res, 504, error?.name === 'TimeoutError' ? 'timeout' : 'network')
    }
  }

  /* ---------- Routing ---------- */

  const handle = async (req, res, next) => {
    const path = (req.url ?? '').split('?')[0]

    // Pages on other origins must not be able to spend this key.
    const origin = req.headers.origin
    if (origin && new URL(origin).host !== req.headers.host) return fail(res, 403, 'forbidden')

    if (req.method === 'GET' && path === '/status') {
      return sendJSON(res, 200, { provider: 'openrouter', configured: apiKey !== '' })
    }
    if (req.method !== 'POST' || !['/chat', '/decisions', '/embeddings', '/rerank', '/speech'].includes(path)) return next()
    if (!apiKey) return fail(res, 503, 'missing_key')

    const body = await readBody(req, path === '/chat' ? MAX_IMAGE_BODY_BYTES : MAX_BODY_BYTES)
    if (!body) return fail(res, 400, 'bad_request')

    if (path === '/chat') return chat(req, res, body)
    if (path === '/decisions') return decisions(res, body)
    if (path === '/embeddings') return embeddings(res, body)
    if (path === '/rerank') return rerank(res, body)
    return speech(res, body)
  }

  return {
    name: 'nexus-ai-service',
    // Runs again whenever .env changes, because Vite restarts the server.
    config(_config, { mode }) {
      const env = loadEnv(mode, process.cwd(), '')
      // VITE_OPENROUTER_API_KEY is accepted so an existing .env.local keeps
      // working, but it is only ever read here, on the server side.
      apiKey = (env.OPENROUTER_API_KEY || env.VITE_OPENROUTER_API_KEY || '').trim()
      if (apiKey === 'YOUR_OPENROUTER_KEY_HERE' || apiKey === 'your_key_here') apiKey = ''
      config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'))
    },
    configureServer(server) {
      // A change to the model list restarts the server, like a change to .env.
      server.watcher.add(CONFIG_FILE.pathname)
      server.watcher.on('change', (file) => file === CONFIG_FILE.pathname && server.restart())
      server.middlewares.use('/__ai', handle)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/__ai', handle)
    },
  }
}
