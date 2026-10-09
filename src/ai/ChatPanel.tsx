import { ArrowUp, Check, Copy, ImagePlus, RotateCcw, Sparkles, Square, SquarePen, X } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import { aiService, describeAIError } from '../services/ai/aiService'
import { capabilities, modelLabel, modelName, type ChatCapability } from '../services/ai/models'
import { type Persona } from '../services/ai/systemPrompt'
import { AIError, type AIContext, type AIMessage } from '../services/ai/types'
import { RichText } from './RichText'

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  /** A picture the person attached, as a data URL. */
  image?: string
  /** The model that wrote this reply. */
  model?: string
}

interface ChatError {
  message: string
  canRetry: boolean
}

interface ChatPanelProps {
  capability: ChatCapability
  persona: Persona
  /** Decided by NEXUS policy, never by the model. */
  allowed: boolean
  /** What NEXUS knows about the person's day, read when a message is sent. */
  getContext?: () => AIContext
  /** A model from Settings to try first. */
  preferredModel?: string | null
  heading: string
  placeholder: string
  suggestions?: string[]
}

const MAX_INPUT_HEIGHT = 132
const MAX_IMAGE_SIDE = 1024

/** Shrinks a chosen picture so it is quick to send, and returns it as a JPEG data URL. */
async function readImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')!
  // JPEG has no transparency, so put the picture on white.
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.85)
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () =>
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  return (
    <button type="button" className="ai-message__action" onClick={copy} aria-label="Copy response">
      {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/**
 * One NEXUS AI conversation. It talks to aiService and nothing else: which
 * provider and model answer is decided there, and the label shows whichever
 * model actually did.
 */
export function ChatPanel({
  capability,
  persona,
  allowed,
  getContext,
  preferredModel,
  heading,
  placeholder,
  suggestions = [],
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ChatError | null>(null)
  /** The model that answered most recently. Null until one has. */
  const [answeredBy, setAnsweredBy] = useState<string | null>(null)

  const nextId = useRef(1)
  const request = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // The conversation and settings as they are right now, for code that runs after an await.
  const history = useRef(messages)
  history.current = messages
  const latest = useRef({ getContext, preferredModel, allowed })
  latest.current = { getContext, preferredModel, allowed }

  const acceptsImages = capabilities[capability].acceptsImages === true

  // Say so up front if this computer has no AI set up, rather than after the first question.
  useEffect(() => {
    let current = true
    aiService
      .getStatus()
      .then((status) => {
        if (current && !status.configured) setError(describeAIError(new AIError('missing_key')))
      })
      .catch((problem) => current && setError(describeAIError(problem)))
    return () => {
      current = false
    }
  }, [])

  useEffect(() => () => request.current?.abort(), [])

  // A test or class that switches AI off also stops a reply that is on its way.
  useEffect(() => {
    if (!allowed) request.current?.abort()
  }, [allowed])

  useEffect(() => {
    const view = scrollRef.current
    if (view) view.scrollTop = view.scrollHeight
  }, [messages, busy, error])

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, MAX_INPUT_HEIGHT)}px`
  }, [draft])

  /** Asks for a reply to the conversation as given, which must end with the person's message. */
  const reply = async (conversation: ChatMessage[]) => {
    const controller = new AbortController()
    request.current = controller
    const replyId = nextId.current++
    let started = false
    let model: string | undefined
    setBusy(true)
    setError(null)

    try {
      await aiService.sendMessage(
        {
          capability,
          persona,
          history: conversation.map<AIMessage>(({ role, text, image }) => ({ role, content: text, image })),
          context: latest.current.getContext?.(),
          allowed: latest.current.allowed,
          model: latest.current.preferredModel,
        },
        {
          signal: controller.signal,
          onModel: (id) => {
            if (controller.signal.aborted) return
            model = id
            setAnsweredBy(id)
            // A fallback can be named after the reply has started; keep its label true.
            if (started) setMessages((current) => current.map((m) => (m.id === replyId ? { ...m, model: id } : m)))
          },
          onDelta: (piece) => {
            if (controller.signal.aborted) return
            // Decided here, not inside the updater: React runs updaters later.
            const first = !started
            started = true
            setMessages((current) =>
              first
                ? [...current, { id: replyId, role: 'assistant', text: piece, model }]
                : current.map((m) => (m.id === replyId ? { ...m, text: m.text + piece } : m)),
            )
          },
        },
      )
    } catch (problem) {
      const failure = describeAIError(problem)
      // Stopping keeps whatever had arrived. Anything else is a half answer, so drop it and offer Retry.
      if (failure.code !== 'cancelled') {
        setMessages((current) => current.filter((m) => m.id !== replyId))
        setError(failure)
      }
    } finally {
      if (request.current === controller) {
        request.current = null
        setBusy(false)
      }
    }
  }

  const send = (text: string) => {
    const question = text.trim()
    if ((!question && !image) || busy || !allowed) return
    const conversation: ChatMessage[] = [
      ...history.current,
      { id: nextId.current++, role: 'user', text: question || 'What is in this picture?', image: image ?? undefined },
    ]
    setMessages(conversation)
    setDraft('')
    setImage(null)
    void reply(conversation)
  }

  const retry = () => {
    if (busy || !allowed) return
    const conversation = history.current
    if (conversation.at(-1)?.role === 'user') void reply(conversation)
    else setError(null)
  }

  const stop = () => request.current?.abort()

  const newChat = () => {
    request.current?.abort()
    request.current = null
    setBusy(false)
    setMessages([])
    setError(null)
    setDraft('')
    setImage(null)
    setAnsweredBy(null)
    inputRef.current?.focus()
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    send(draft)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter makes a new line. Leave Enter alone while an input method is composing.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send(draft)
    }
  }

  const onPickImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    readImage(file).then(setImage, () => setError({ message: 'That picture couldn’t be opened. Try a PNG or JPEG.', canRetry: false }))
  }

  const isFresh = messages.length === 0
  const waiting = busy && messages.at(-1)?.role !== 'assistant'

  return (
    <div className="ai-panel">
      <header className="ai__bar">
        <span className="ai-model" title="The model shown is the one that answered most recently.">
          <Sparkles size={12} /> {modelLabel(capability, answeredBy)}
        </span>
        {!isFresh && (
          <button type="button" className="ai__clear" onClick={newChat} title="Clears this conversation and starts again">
            <SquarePen size={13} /> New chat
          </button>
        )}
      </header>

      <div className="ai__scroll" ref={scrollRef} aria-live="polite">
        {isFresh && (
          <div className="ai__hero">
            <span className="ai__orb">
              <Sparkles size={22} />
            </span>
            <div className="ai__label">NEXUS AI</div>
            <h2 className="ai__heading">{heading}</h2>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`ai-message ai-message--${message.role}`}>
            {message.image && <img className="ai-message__image" src={message.image} alt="Attached picture" />}
            {message.role === 'assistant' ? <RichText text={message.text} /> : message.text}
            {message.role === 'assistant' && !(busy && message === messages.at(-1)) && (
              <div className="ai-message__footer">
                {message.model && <span>{modelName(message.model)}</span>}
                <CopyButton text={message.text} />
              </div>
            )}
          </div>
        ))}

        {waiting && (
          <div className="ai-message ai-message--assistant ai-message--thinking" role="status" aria-label="NEXUS AI is replying">
            <span />
            <span />
            <span />
          </div>
        )}

        {error && (
          <div className="ai-error" role="alert">
            <span>{error.message}</span>
            {error.canRetry && messages.at(-1)?.role === 'user' && (
              <button type="button" className="ai-error__retry" onClick={retry}>
                <RotateCcw size={13} /> Try again
              </button>
            )}
          </div>
        )}

        {isFresh && suggestions.length > 0 && (
          <div className="ai__suggestions">
            {suggestions.map((suggestion) => (
              <button key={suggestion} type="button" className="ai__chip" onClick={() => send(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {image && (
        <div className="ai__attachment">
          <img src={image} alt="Picture to send" />
          <button type="button" className="ai__attachment-remove" onClick={() => setImage(null)} aria-label="Remove picture">
            <X size={12} />
          </button>
        </div>
      )}

      <form className="ai__composer" onSubmit={onSubmit}>
        {acceptsImages && (
          <>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onPickImage} />
            <button type="button" className="ai__attach" onClick={() => fileRef.current?.click()} aria-label="Attach a picture">
              <ImagePlus size={16} />
            </button>
          </>
        )}
        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Message NEXUS AI"
        />
        {busy ? (
          <button type="button" className="ai__send ai__send--stop" onClick={stop} aria-label="Stop">
            <Square size={12} fill="currentColor" />
          </button>
        ) : (
          <button type="submit" className="ai__send" disabled={!draft.trim() && !image} aria-label="Send">
            <ArrowUp size={16} strokeWidth={2.4} />
          </button>
        )}
      </form>
      <p className="ai__footnote">NEXUS AI can make mistakes. Check anything important.</p>
    </div>
  )
}
