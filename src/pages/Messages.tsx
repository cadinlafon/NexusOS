import { ArrowUp, Lock } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { testSession } from '../data/mockData'
import { PageHeader } from '../components/PageHeader'
import { useNexus } from '../state/NexusContext'
import { permissionKey, relativeTime } from '../state/selectors'

export function Messages() {
  const {
    conversations,
    activeConversationId,
    openConversation,
    sendMessage,
    getSubject,
    getPermission,
  } = useNexus()
  const [draft, setDraft] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)

  const locked = getPermission(permissionKey('page', 'messages')).state !== 'allowed'
  const active = conversations.find((c) => c.id === activeConversationId) ?? null
  const messageCount = active?.messages.length ?? 0

  // Keep the newest message in view.
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [active?.id, messageCount])

  if (locked) {
    return (
      <div className="page">
        <PageHeader eyebrow="Messages" title="Conversations" />
        <section className="locked-panel glass">
          <span className="restriction__icon">
            <Lock size={22} />
          </span>
          <h2>Messages are paused</h2>
          <p>
            Test Mode is on for {getSubject(testSession.subjectId)?.name}: {testSession.title}. Your
            conversations will be here when the test ends.
          </p>
        </section>
      </div>
    )
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || !active) return
    sendMessage(active.id, text)
    setDraft('')
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Messages"
        title="Conversations"
        description="Messages between you and your teachers."
      />

      <section className="messages glass">
        <div className="messages__list">
          {conversations.map((conversation) => {
            const last = conversation.messages[conversation.messages.length - 1]
            return (
              <button
                key={conversation.id}
                type="button"
                className={`conversation-row${conversation.id === active?.id ? ' is-active' : ''}`}
                onClick={() => openConversation(conversation.id)}
              >
                <span className="avatar avatar--soft">{conversation.initials}</span>
                <span className="conversation-row__text">
                  <span className="conversation-row__top">
                    <span className="conversation-row__name">{conversation.teacher}</span>
                    <span className="conversation-row__time">{last && relativeTime(last.time)}</span>
                  </span>
                  <span className="conversation-row__preview">
                    {last?.from === 'student' && 'You: '}
                    {last?.text}
                  </span>
                </span>
                {conversation.unread > 0 && (
                  <span className="nav-item__badge" aria-label={`${conversation.unread} unread`}>
                    {conversation.unread}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {active ? (
          <div className="messages__thread">
            <header className="messages__header">
              <span className="avatar avatar--soft">{active.initials}</span>
              <div>
                <div className="conversation-row__name">{active.teacher}</div>
                <div className="conversation-row__time">{getSubject(active.subjectId)?.name} teacher</div>
              </div>
            </header>

            <div className="messages__scroll" ref={threadRef}>
              {active.messages.map((message) => (
                <div key={message.id} className={`bubble bubble--${message.from}`}>
                  {message.text}
                  <span className="bubble__time">{relativeTime(message.time)}</span>
                </div>
              ))}
            </div>

            <form className="messages__composer" onSubmit={submit}>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Message ${active.teacher}`}
                aria-label={`Message ${active.teacher}`}
              />
              <button type="submit" className="ai__send" disabled={!draft.trim()} aria-label="Send">
                <ArrowUp size={16} strokeWidth={2.4} />
              </button>
            </form>
          </div>
        ) : (
          <div className="messages__empty">Choose a conversation to read it.</div>
        )}
      </section>
    </div>
  )
}
