import { capabilities, type CapabilityId, type ChatCapability } from './models'
import { openRouterProvider } from './openRouterProvider'
import { buildSystemPrompt, type Persona } from './systemPrompt'
import {
  AIError,
  type AIContext,
  type AIErrorCode,
  type AIMessage,
  type AIProvider,
  type AIProviderStatus,
  type AIResponse,
  type AISendOptions,
  type DecisionQuestion,
  type DecisionResult,
  type EmbeddingResult,
  type RerankResult,
  type SpeechResult,
} from './types'

// The one door to AI for the rest of NEXUS.
//
//   NEXUS AI (StudentOS, ClassroomOS)  →  aiService  →  provider  →  a free model
//
// Interface code talks to this file only. To move NEXUS to another provider,
// or to a school's own server, write one more AIProvider and change the line
// below.
let provider: AIProvider = openRouterProvider

/** Keep requests small: the model sees the most recent part of a long chat. */
const HISTORY_LIMIT = 24

export interface ChatRequest {
  capability: ChatCapability
  /** Who is being helped, which sets the tone and the limits of the system prompt. */
  persona: Persona
  /** The conversation so far, ending with the newest message. */
  history: AIMessage[]
  /** What NEXUS knows about the person's day. Left out for teachers. */
  context?: AIContext
  /**
   * Whether NEXUS policy allows AI right now. The caller gets this from the
   * policy system; the model is never asked.
   */
  allowed: boolean
  /** A preferred model for this capability, from Settings. */
  model?: string | null
}

/** Refuses a capability with no free model before anything is sent. */
const requireAvailable = (id: CapabilityId) => {
  if (!capabilities[id].available) throw new AIError('not_configured')
}

const guarded = async <T>(id: CapabilityId, call: () => Promise<T>): Promise<T> => {
  requireAvailable(id)
  try {
    return await call()
  } catch (error) {
    throw error instanceof AIError ? error : new AIError('unknown')
  }
}

export const aiService = {
  get providerName() {
    return provider.name
  },

  setProvider(next: AIProvider) {
    provider = next
  },

  getStatus(): Promise<AIProviderStatus> {
    return provider.getStatus()
  },

  async sendMessage(
    { capability, persona, history, context, allowed, model }: ChatRequest,
    options?: AISendOptions,
  ): Promise<AIResponse> {
    if (!allowed) throw new AIError('not_allowed')
    const messages: AIMessage[] = [
      { role: 'system', content: buildSystemPrompt(persona, capability, context) },
      // Only the newest picture is sent again; older ones stay as their text.
      ...history.slice(-HISTORY_LIMIT).map((message, index, list) =>
        message.image && index !== list.length - 1 ? { role: message.role, content: message.content } : message,
      ),
    ]
    return guarded(capability, () => provider.sendMessage({ capability, messages, model: model ?? undefined }, options))
  },

  /** Structured recommendations. For teacher workflows only; it never acts on its answer. */
  decide: (state: string, questions: Record<string, DecisionQuestion>): Promise<DecisionResult> =>
    guarded('decisions', () => provider.decide(state, questions)),

  embed: (input: string[]): Promise<EmbeddingResult> => guarded('embeddings', () => provider.embed(input)),

  rerank: (query: string, documents: string[]): Promise<RerankResult> =>
    guarded('rerank', () => provider.rerank(query, documents)),

  speak: (input: string): Promise<SpeechResult> => guarded('voice', () => provider.speak(input)),
}

const messages: Record<AIErrorCode, string> = {
  missing_key: 'NEXUS AI isn’t set up on this computer yet. Ask your teacher or school administrator.',
  invalid_key: 'NEXUS AI isn’t set up correctly on this computer. Ask your teacher or school administrator.',
  no_credits: 'NEXUS AI has reached its limit for now. Ask your teacher or school administrator.',
  rate_limit: 'NEXUS AI is busy right now. Wait a moment and try again.',
  daily_limit: 'NEXUS AI has used up today’s free requests. It will work again tomorrow.',
  model_unavailable: 'NEXUS AI’s model isn’t available right now. Try again in a little while.',
  provider_unavailable: 'NEXUS AI is having trouble right now. Try again in a little while.',
  service_unavailable: 'NEXUS AI isn’t available on this computer right now.',
  network: 'NEXUS AI couldn’t connect right now. Check your connection and try again.',
  timeout: 'NEXUS AI took too long to answer. Try again.',
  malformed: 'NEXUS AI sent back an answer that couldn’t be read. Try again.',
  not_allowed: 'NEXUS AI is unavailable during this activity.',
  not_configured: 'This isn’t available: no compatible free model is configured.',
  cancelled: 'Stopped.',
  unknown: 'Something went wrong with NEXUS AI. Try again.',
}

/** Errors that trying again will not fix. */
const NEEDS_SETUP: AIErrorCode[] = [
  'missing_key',
  'invalid_key',
  'no_credits',
  'daily_limit',
  'service_unavailable',
  'not_allowed',
  'not_configured',
]

/** A calm, student-safe description of a failure. Never includes provider output. */
export function describeAIError(error: unknown): { code: AIErrorCode; message: string; canRetry: boolean } {
  const code = error instanceof AIError ? error.code : 'unknown'
  return { code, message: messages[code], canRetry: !NEEDS_SETUP.includes(code) }
}
