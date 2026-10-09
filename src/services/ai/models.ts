import config from '../../../ai/models.json'

// The capability registry, read from ai/models.json. That file is the single
// place a model id is written; this module only gives it types and helpers.
// Nothing else in NEXUS should contain a model id.

export const CAPABILITY_IDS = [
  'chat',
  'coding',
  'longContext',
  'image',
  'decisions',
  'embeddings',
  'rerank',
  'voice',
  'transcription',
  'video',
  'audioGeneration',
] as const

export type CapabilityId = (typeof CAPABILITY_IDS)[number]

/** The capabilities that hold a conversation. */
export type ChatCapability = 'chat' | 'coding' | 'longContext' | 'image'

export interface ConfiguredModel {
  id: string
  name: string
  role?: string
}

export interface Capability {
  id: CapabilityId
  label: string
  description: string
  audience: 'everyone' | 'teachers'
  /** In the order they are tried. Empty when nothing free is configured. */
  models: ConfiguredModel[]
  available: boolean
  /** Why it is unavailable, when it is. */
  unavailable?: string
  acceptsImages?: boolean
  dimensions?: number
}

export const UNAVAILABLE_LABEL = 'Unavailable — no compatible free model configured'

type RawCapability = Omit<Capability, 'id' | 'available'>
const raw = config.capabilities as unknown as Record<CapabilityId, RawCapability>

export const capabilities: Record<CapabilityId, Capability> = Object.fromEntries(
  CAPABILITY_IDS.map((id) => [id, { ...raw[id], id, available: raw[id].models.length > 0 }]),
) as Record<CapabilityId, Capability>

export const capabilityList: Capability[] = CAPABILITY_IDS.map((id) => capabilities[id])

export const providerName: string = config.provider

const names = new Map(capabilityList.flatMap((c) => c.models.map((m) => [m.id, m.name] as const)))

/** A model's plain name. An id NEXUS does not know is shown as it is, never guessed at. */
export const modelName = (id: string) => names.get(id) ?? names.get(`${id}:free`) ?? id

/** The model a capability tries first. */
export const primaryModel = (id: CapabilityId): ConfiguredModel | null => capabilities[id].models[0] ?? null

/**
 * The line shown wherever a capability is used.
 *   answeredBy given  → "Chat · Using NVIDIA Nemotron 3 Super"  (it really answered)
 *   nothing yet       → "Chat · NVIDIA Nemotron 3 Super"        (what will be tried first)
 *   nothing configured → "Chat · Unavailable — no compatible free model configured"
 */
export function modelLabel(id: CapabilityId, answeredBy?: string | null): string {
  const capability = capabilities[id]
  if (!capability.available) return `${capability.label} · ${UNAVAILABLE_LABEL}`
  if (answeredBy) return `${capability.label} · Using ${modelName(answeredBy)}`
  return `${capability.label} · ${capability.models[0].name}`
}
