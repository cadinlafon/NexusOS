import {
  AIError,
  type AIErrorCode,
  type AIMessage,
  type AIProvider,
  type AIProviderStatus,
  type DecisionResult,
  type EmbeddingResult,
  type RerankResult,
} from './types'

// OpenRouter, reached through the NEXUS AI service rather than directly.
//
//   this file  →  /__ai (NEXUS AI service)  →  https://openrouter.ai/api/v1
//
// The service holds the OpenRouter key and the list of free models. A student
// computer sees neither the key nor a way to name a paid model: in development
// the service is ai/aiServicePlugin.mjs inside the dev server, and in a school
// it will be an authenticated backend at the same address. Only this file
// would need to change to point somewhere else.

const SERVICE_URL = '/__ai'

/** Give up if the service is silent for this long, before or during a reply. */
const SILENCE_TIMEOUT_MS = 45_000
const REQUEST_TIMEOUT_MS = 60_000

const KNOWN_CODES: AIErrorCode[] = [
  'missing_key',
  'invalid_key',
  'no_credits',
  'rate_limit',
  'daily_limit',
  'model_unavailable',
  'provider_unavailable',
  'network',
  'timeout',
  'malformed',
  'not_configured',
]

async function errorFrom(response: Response): Promise<AIError> {
  // No service at this address at all: a built copy opened without the dev server.
  if (response.status === 404 || response.status === 405) return new AIError('service_unavailable')
  try {
    const code = (await response.json())?.error?.code as AIErrorCode
    return new AIError(KNOWN_CODES.includes(code) ? code : 'unknown')
  } catch {
    return new AIError('unknown')
  }
}

/** A plain request to the service that answers with JSON or a file. */
async function post(path: string, body: unknown): Promise<Response> {
  let response: Response
  try {
    response = await fetch(`${SERVICE_URL}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    throw new AIError((error as Error)?.name === 'TimeoutError' ? 'timeout' : 'network')
  }
  if (!response.ok) throw await errorFrom(response)
  return response
}

const json = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await post(path, body)
  try {
    return (await response.json()) as T
  } catch {
    throw new AIError('malformed')
  }
}

/** A message in OpenRouter's format: plain text, or text with a picture. */
const toWire = ({ role, content, image }: AIMessage) =>
  image
    ? { role, content: [{ type: 'text', text: content }, { type: 'image_url', image_url: { url: image } }] }
    : { role, content }

export const openRouterProvider: AIProvider = {
  id: 'openrouter',
  name: 'OpenRouter',
  supportsStreaming: true,

  async getStatus(): Promise<AIProviderStatus> {
    try {
      const response = await fetch(`${SERVICE_URL}/status`)
      if (!response.ok) throw await errorFrom(response)
      return { configured: (await response.json()).configured === true }
    } catch (error) {
      throw error instanceof AIError ? error : new AIError('service_unavailable')
    }
  },

  decide: (state, questions) => json<DecisionResult>('decisions', { state, questions }),
  embed: (input) => json<EmbeddingResult>('embeddings', { input }),
  rerank: (query, documents) => json<RerankResult>('rerank', { query, documents }),

  async speak(input) {
    const response = await post('speech', { input })
    const model = response.headers.get('x-nexus-model')
    const audio = await response.blob()
    if (!model || audio.size === 0) throw new AIError('malformed')
    return { model, audio }
  },

  async sendMessage({ capability, messages, model }, { signal, onDelta, onModel } = {}) {
    const request = new AbortController()
    let timedOut = false
    let timer = 0
    const watch = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        timedOut = true
        request.abort()
      }, SILENCE_TIMEOUT_MS)
    }
    const cancel = () => request.abort()
    signal?.addEventListener('abort', cancel)

    try {
      if (signal?.aborted) throw new AIError('cancelled')
      watch()

      const response = await fetch(`${SERVICE_URL}/chat`, {
        method: 'POST',
        signal: request.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capability, model, messages: messages.map(toWire) }),
      })
      if (!response.ok) throw await errorFrom(response)
      if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
        throw new AIError(response.body ? 'service_unavailable' : 'malformed')
      }

      // The service says which model it reached. If that model then fails
      // over inside OpenRouter, the stream names the one really answering.
      let answeredBy = response.headers.get('x-nexus-model') ?? undefined
      if (answeredBy) onModel?.(answeredBy)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let text = ''

      // Server-sent events: one "data: {json}" line per piece of the reply.
      const readLine = (line: string) => {
        if (!line.startsWith('data:')) return
        const data = line.slice(5).trim()
        if (!data || data === '[DONE]') return
        let event
        try {
          event = JSON.parse(data)
        } catch {
          throw new AIError('malformed')
        }
        if (event.error) {
          const status = Number(event.error.code)
          throw new AIError(status === 429 ? 'rate_limit' : status === 402 ? 'no_credits' : 'provider_unavailable')
        }
        if (typeof event.model === 'string' && event.model && event.model !== answeredBy) {
          answeredBy = event.model as string
          onModel?.(answeredBy)
        }
        const delta = event.choices?.[0]?.delta?.content
        if (typeof delta === 'string' && delta) {
          text += delta
          onDelta?.(delta)
        }
      }

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        watch()
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        lines.forEach(readLine)
      }
      readLine(buffer)

      if (!text.trim()) throw new AIError('malformed')
      return { text, model: answeredBy }
    } catch (error) {
      if (error instanceof AIError) throw error
      if (timedOut) throw new AIError('timeout')
      if (signal?.aborted) throw new AIError('cancelled')
      throw new AIError('network')
    } finally {
      window.clearTimeout(timer)
      signal?.removeEventListener('abort', cancel)
    }
  },
}
