import { CircleCheck, CircleSlash, Play, Search, Volume2 } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { aiService, describeAIError } from '../services/ai/aiService'
import { AIError } from '../services/ai/types'
import { semanticSearch, type SearchDocument, type SearchResult } from '../services/ai/embeddingService'
import {
  capabilityList,
  modelLabel,
  modelName,
  UNAVAILABLE_LABEL,
  type Capability,
  type CapabilityId,
} from '../services/ai/models'

/** The "Voice · Using …" line every panel carries. */
function ModelLine({ capability, answeredBy }: { capability: CapabilityId; answeredBy?: string | null }) {
  return <div className="ai-model ai-model--block">{modelLabel(capability, answeredBy)}</div>
}

/* ---------- Voice ---------- */

/** Reads typed text aloud. This is text to speech only; nothing here listens. */
export function VoicePanel({ allowed }: { allowed: boolean }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [result, setResult] = useState<{ url: string; model: string } | null>(null)

  // Let go of the audio when it is replaced or the panel closes.
  useEffect(() => () => void (result && URL.revokeObjectURL(result.url)), [result])

  const speak = async (event: FormEvent) => {
    event.preventDefault()
    if (!text.trim() || busy || !allowed) return
    setBusy(true)
    setProblem(null)
    try {
      const { audio, model } = await aiService.speak(text.trim())
      setResult({ url: URL.createObjectURL(audio), model })
    } catch (error) {
      setProblem(describeAIError(error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="ai-tool" onSubmit={speak}>
      <ModelLine capability="voice" answeredBy={result?.model} />
      <p className="ai-tool__intro">Type something and NEXUS AI will read it aloud. Up to 600 characters.</p>
      <textarea
        className="ai-tool__input"
        rows={5}
        maxLength={600}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Text to read aloud"
        aria-label="Text to read aloud"
      />
      <button type="submit" className="app-button app-button--primary" disabled={!text.trim() || busy}>
        <Volume2 size={14} /> {busy ? 'Making audio…' : 'Read aloud'}
      </button>
      {problem && (
        <p className="ai-error" role="alert">
          {problem}
        </p>
      )}
      {result && <audio className="ai-tool__audio" src={result.url} controls autoPlay />}
    </form>
  )
}

/* ---------- Search by meaning ---------- */

/** Searches the documents it is given, and only those. */
export function SearchPanel({
  documents,
  sourceLabel,
  allowed,
}: {
  documents: SearchDocument[]
  /** What is being searched, e.g. "your documents". */
  sourceLabel: string
  allowed: boolean
}) {
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [result, setResult] = useState<SearchResult | null>(null)

  const search = async (event: FormEvent) => {
    event.preventDefault()
    if (!query.trim() || busy || !allowed) return
    setBusy(true)
    setProblem(null)
    try {
      setResult(await semanticSearch(query.trim(), documents))
    } catch (error) {
      setProblem(describeAIError(error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="ai-tool" onSubmit={search}>
      <ModelLine capability="embeddings" answeredBy={result?.model} />
      <p className="ai-tool__intro">
        Search {sourceLabel} by meaning, not exact words. {documents.length === 0 ? 'There is nothing to search yet.' : `${documents.length} to search.`}
      </p>
      <div className="ai-tool__row">
        <input
          className="ai-tool__input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="What are you looking for?"
          aria-label="Search by meaning"
        />
        <button type="submit" className="app-button app-button--primary" disabled={!query.trim() || busy || documents.length === 0}>
          <Search size={14} /> {busy ? 'Searching…' : 'Search'}
        </button>
      </div>
      {problem && (
        <p className="ai-error" role="alert">
          {problem}
        </p>
      )}
      {result && (
        <ol className="ai-results">
          {result.hits.map(({ document, score }) => (
            <li key={document.id}>
              <span className="ai-results__title">{document.title || 'Untitled'}</span>
              <span className="ai-results__score">{Math.round(score * 100)}% match</span>
              <span className="ai-results__text">{document.text.slice(0, 140)}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="ai-tool__note">
        Nothing is stored: the documents are compared each time you search ({result ? `${result.dimensions}-number vectors` : 'in memory'}).
        Searching a whole school’s files needs an index, which NEXUS does not have yet.
      </p>
    </form>
  )
}

/* ---------- Models and tests ---------- */

type TestState = { status: 'running' } | { status: 'passed'; detail: string; model: string } | { status: 'failed'; detail: string }

/** One small, real request per capability. It reports the model that answered, or the error. */
async function runTest(id: CapabilityId): Promise<{ detail: string; model: string }> {
  switch (id) {
    case 'image': {
      // A real picture: a plain red square, drawn here.
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 64
      const context = canvas.getContext('2d')!
      context.fillStyle = '#dc1e1e'
      context.fillRect(0, 0, 64, 64)
      const reply = await aiService.sendMessage({
        capability: 'image',
        persona: 'teacher',
        allowed: true,
        history: [{ role: 'user', content: 'What single colour fills this picture? One word.', image: canvas.toDataURL('image/png') }],
      })
      const sawRed = /red/i.test(reply.text)
      if (!sawRed) throw new AIError('malformed')
      return { detail: 'Saw the red test square', model: reply.model ?? '' }
    }
    case 'chat':
    case 'coding':
    case 'longContext': {
      const reply = await aiService.sendMessage({
        capability: id,
        persona: 'teacher',
        allowed: true,
        history: [{ role: 'user', content: 'This is a connection test. Reply with exactly: OK' }],
      })
      return { detail: `Replied “${reply.text.trim().slice(0, 40)}”`, model: reply.model ?? '' }
    }
    case 'decisions': {
      const result = await aiService.decide('A homework task is due tomorrow and nobody has started it.', {
        late: { type: 'noul', instructions: 'The work is at risk of being late' },
      })
      const answer = result.answers.late
      return { detail: `Answered yes with ${answer.type === 'noul' ? Math.round(answer.noul * 100) : '?'}% likelihood`, model: result.model }
    }
    case 'embeddings': {
      const result = await aiService.embed(['Plants make food from sunlight.', 'Photosynthesis'])
      return { detail: `Returned ${result.embeddings.length} vectors of ${result.dimensions} numbers`, model: result.model }
    }
    case 'rerank': {
      const result = await aiService.rerank('How do plants make food?', ['The French Revolution began in 1789.', 'Photosynthesis turns light into glucose.'])
      const best = [...result.results].sort((a, b) => b.score - a.score)[0]
      return { detail: best?.index === 1 ? 'Ranked the right document first' : 'Answered, but ranked the wrong document first', model: result.model }
    }
    case 'voice': {
      const result = await aiService.speak('NEXUS voice test.')
      return { detail: `Returned ${Math.round(result.audio.size / 1024)} KB of audio`, model: result.model }
    }
    default:
      throw new Error('unavailable')
  }
}

function CapabilityRow({ capability, action }: { capability: Capability; action?: ReactNode }) {
  return (
    <li className={`ai-capability${capability.available ? '' : ' is-unavailable'}`}>
      <span className="ai-capability__icon">{capability.available ? <CircleCheck size={15} /> : <CircleSlash size={15} />}</span>
      <div className="ai-capability__text">
        <div className="ai-capability__name">
          {capability.label}
          {capability.audience === 'teachers' && <span className="ai-capability__tag">Teachers</span>}
        </div>
        <div className="ai-capability__detail">{capability.description}</div>
        {capability.available ? (
          <div className="ai-capability__models">
            {capability.models.map((model) => (
              <span key={model.id}>
                {model.name}
                {model.role && model.role !== 'Main' ? ` (${model.role.toLowerCase()})` : ''}
              </span>
            ))}
          </div>
        ) : (
          <div className="ai-capability__models">
            {UNAVAILABLE_LABEL}. {capability.unavailable}
          </div>
        )}
      </div>
      {action}
    </li>
  )
}

/**
 * Every capability, the free model behind it, and a Test button that makes one
 * small real request. Unavailable ones say what is missing.
 */
export function ModelsPanel({ role }: { role: 'student' | 'teacher' }) {
  const [tests, setTests] = useState<Partial<Record<CapabilityId, TestState>>>({})

  const test = async (id: CapabilityId) => {
    setTests((current) => ({ ...current, [id]: { status: 'running' } }))
    try {
      const { detail, model } = await runTest(id)
      setTests((current) => ({ ...current, [id]: { status: 'passed', detail, model } }))
    } catch (error) {
      setTests((current) => ({ ...current, [id]: { status: 'failed', detail: describeAIError(error).message } }))
    }
  }

  return (
    <div className="ai-tool">
      <p className="ai-tool__intro">
        NEXUS AI uses free models only, through {aiService.providerName}. It never switches to a paid model: if every
        model for something is busy, you get an error instead.
      </p>
      <ul className="ai-capabilities">
        {capabilityList.map((capability) => {
          const state = tests[capability.id]
          return (
            <CapabilityRow
              key={capability.id}
              capability={capability}
              action={
                capability.available &&
                // Teacher-only capabilities are listed for students, but not run by them.
                (role === 'teacher' || capability.audience === 'everyone') && (
                  <div className="ai-capability__test">
                    <button type="button" className="app-button" disabled={state?.status === 'running'} onClick={() => void test(capability.id)}>
                      <Play size={12} /> {state?.status === 'running' ? 'Testing…' : 'Test'}
                    </button>
                    {state?.status === 'passed' && (
                      <span className="ai-capability__result is-ok">
                        {state.detail}. Using {modelName(state.model)}.
                      </span>
                    )}
                    {state?.status === 'failed' && <span className="ai-capability__result is-bad">{state.detail}</span>}
                  </div>
                )
              }
            />
          )
        })}
      </ul>
    </div>
  )
}
