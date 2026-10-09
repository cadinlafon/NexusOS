import { type ChatCapability } from './models'

// The shapes NEXUS AI is built on. The interface, the service and the tool
// definitions know nothing about any one AI company; only a provider does.

export type AIRole = 'system' | 'user' | 'assistant'

export interface AIMessage {
  role: AIRole
  content: string
  /** A picture to look at, as a data URL. Only the image capability accepts one. */
  image?: string
}

export interface AIRequest {
  /** What kind of help this is. The provider picks the model for it. */
  capability: ChatCapability
  messages: AIMessage[]
  /** One of that capability's configured models to try first. */
  model?: string
}

export interface AISendOptions {
  /** Cancels the request (Stop, New chat, or the window closing). */
  signal?: AbortSignal
  /** Called with each new piece of the reply, for providers that stream. */
  onDelta?: (text: string) => void
  /** Called once, as soon as it is known which model is answering. */
  onModel?: (model: string) => void
}

export interface AIResponse {
  text: string
  /** The model that actually answered. */
  model?: string
}

export interface AIProviderStatus {
  /** Whether the provider has what it needs (for example, a key) to answer. */
  configured: boolean
}

/** A yes/no question, or a choice between named options, put to a decision model. */
export type DecisionQuestion =
  | { type: 'noul'; instructions: string }
  | { type: 'choice'; instructions: string; criteria: Record<string, string> }

export type DecisionAnswer =
  /** How likely "yes" is, from 0 to 1. */
  | { type: 'noul'; noul: number }
  | { type: 'choice'; choice: string; confidence?: number; probabilities?: Record<string, number> }

export interface DecisionResult {
  model: string
  answers: Record<string, DecisionAnswer>
}

export interface EmbeddingResult {
  model: string
  dimensions: number
  embeddings: number[][]
}

export interface RerankResult {
  model: string
  /** One per document: its position in the list given, and how relevant it is. */
  results: { index: number; score: number }[]
}

export interface SpeechResult {
  model: string
  /** A WAV file. */
  audio: Blob
}

/** One way of reaching models: OpenRouter today; a school-hosted service or another provider later. */
export interface AIProvider {
  id: string
  name: string
  supportsStreaming: boolean
  getStatus(): Promise<AIProviderStatus>
  sendMessage(request: AIRequest, options?: AISendOptions): Promise<AIResponse>
  decide(state: string, questions: Record<string, DecisionQuestion>): Promise<DecisionResult>
  embed(input: string[]): Promise<EmbeddingResult>
  rerank(query: string, documents: string[]): Promise<RerankResult>
  speak(input: string): Promise<SpeechResult>
}

export type AIErrorCode =
  | 'missing_key'
  | 'invalid_key'
  | 'no_credits'
  | 'rate_limit'
  | 'daily_limit'
  | 'model_unavailable'
  | 'provider_unavailable'
  | 'service_unavailable'
  | 'network'
  | 'timeout'
  | 'malformed'
  | 'not_allowed'
  | 'not_configured'
  | 'cancelled'
  | 'unknown'

/** The only error a provider may throw. It carries a code, never raw provider output. */
export class AIError extends Error {
  code: AIErrorCode

  constructor(code: AIErrorCode) {
    super(code)
    this.name = 'AIError'
    this.code = code
  }
}

/**
 * What NEXUS tells the model about the student's situation. It is deliberately
 * anonymous: no name, student number, messages or teacher names.
 */
export interface AIContext {
  localTime: string
  currentClass: { subject: string; room: string; ends: string } | null
  nextClass: { subject: string; starts: string } | null
  scheduleToday: { subject: string; time: string }[]
  currentAssignment: { title: string; subject: string; status: string; due: string; recommendedApp: string } | null
  dueSoon: { title: string; due: string }[]
  openApplications: string[]
  recommendedApplications: string[]
  allowedApplications: string[]
  classWebsites: string[]
  testMode: boolean
}
