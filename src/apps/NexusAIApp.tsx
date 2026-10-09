import { Lock } from 'lucide-react'
import { useRef, useState } from 'react'
import { ChatPanel } from '../ai/ChatPanel'
import { ModelsPanel, SearchPanel, VoicePanel } from '../ai/tools'
import { aiSuggestions } from '../data/appData'
import { testSession } from '../data/mockData'
import { buildAIContext } from '../services/ai/context'
import { useNexus } from '../state/NexusContext'
import { permissionKey } from '../state/selectors'
import { useSettings } from '../state/SettingsContext'

const tabs = [
  { id: 'chat', label: 'Chat' },
  { id: 'coding', label: 'Coding' },
  { id: 'image', label: 'Image' },
  { id: 'voice', label: 'Voice' },
  { id: 'search', label: 'Search' },
  { id: 'models', label: 'Models' },
] as const

type TabId = (typeof tabs)[number]['id']

/** The NEXUS AI window in StudentOS: one tab per thing it can do. */
export function NexusAIApp() {
  const { context, schedule, subjects, openApps, classSites, documents, getPermission, getSubject } = useNexus()
  const { settings } = useSettings()
  const [tab, setTab] = useState<TabId>('chat')

  // School policy, a running test or the class in session decides this; the model never does.
  const permission = getPermission(permissionKey('app', 'nexus-ai'))
  const allowed = permission.state === 'allowed'

  // The context as it is when a message is sent, not when the window opened.
  const sources = useRef({ snapshot: context, schedule, subjects, openApps, classWebsites: classSites })
  sources.current = { snapshot: context, schedule, subjects, openApps, classWebsites: classSites }
  const getContext = () => buildAIContext(sources.current)

  if (!allowed) {
    const reason =
      permission.reason === 'test_mode'
        ? `Test Mode is on for ${getSubject(testSession.subjectId)?.name}: ${testSession.title}. NEXUS AI will be back when the test ends.`
        : permission.reason === 'class_policy'
          ? 'Your teacher has turned NEXUS AI off for this class. It will be back when the class ends.'
          : permission.state === 'teacher_required'
            ? 'NEXUS AI needs your teacher’s approval.'
            : 'NEXUS AI is turned off by your school.'
    return (
      <div className="app ai">
        <div className="ai__locked">
          <span className="ai__orb ai__orb--locked">
            <Lock size={20} />
          </span>
          <div className="ai__label">NEXUS AI</div>
          <h2 className="ai__heading">AI is unavailable during this activity.</h2>
          <p className="ai__reason">{reason}</p>
        </div>
      </div>
    )
  }

  // The student's own documents: the only thing search is ever handed.
  const searchable = Object.entries(documents).map(([id, doc]) => ({ id, title: doc.title, text: doc.body }))

  return (
    <div className="app ai">
      <div className="ai-tabs" role="tablist" aria-label="NEXUS AI">
        {tabs.map((entry) => (
          <button key={entry.id} type="button" role="tab" aria-selected={tab === entry.id} onClick={() => setTab(entry.id)}>
            {entry.label}
          </button>
        ))}
      </div>

      {/* Every tab stays mounted, so a conversation is still there when you come back to it. */}
      <div className="ai-tab" hidden={tab !== 'chat'}>
        <ChatPanel
          capability="chat"
          persona="student"
          allowed={allowed}
          getContext={getContext}
          preferredModel={settings.aiModel}
          heading="How can I help?"
          placeholder="Ask NEXUS AI..."
          suggestions={aiSuggestions}
        />
      </div>
      <div className="ai-tab" hidden={tab !== 'coding'}>
        <ChatPanel
          capability="coding"
          persona="student"
          allowed={allowed}
          getContext={getContext}
          heading="What are you building?"
          placeholder="Ask about code, or paste an error..."
          suggestions={['Explain what a React component is', 'How do I find a bug in my code?']}
        />
      </div>
      <div className="ai-tab" hidden={tab !== 'image'}>
        <ChatPanel
          capability="image"
          persona="student"
          allowed={allowed}
          heading="Show me a picture"
          placeholder="Attach a picture and ask about it..."
        />
      </div>
      <div className="ai-tab ai-tab--scroll" hidden={tab !== 'voice'}>
        <VoicePanel allowed={allowed} />
      </div>
      <div className="ai-tab ai-tab--scroll" hidden={tab !== 'search'}>
        <SearchPanel documents={searchable} sourceLabel="your documents" allowed={allowed} />
      </div>
      <div className="ai-tab ai-tab--scroll" hidden={tab !== 'models'}>
        <ModelsPanel role="student" />
      </div>
    </div>
  )
}
