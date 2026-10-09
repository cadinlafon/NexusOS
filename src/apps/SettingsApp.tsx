import {
  Accessibility,
  Bell,
  LayoutGrid,
  Monitor,
  Paintbrush,
  Sparkles,
  ShieldCheck,
  SquareUser,
  Info,
  Lock,
  Wifi,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useNexus } from '../state/NexusContext'
import { type SettingsSectionId } from '../types/nexus'
import { DeveloperPreview } from './settings/DeveloperPreview'
import {
  AboutSection,
  AccessibilitySection,
  AccountSection,
  AISection,
  AppearanceSection,
  ApplicationsSection,
  DevicesSection,
  NetworkSection,
  NotificationsSection,
  PoliciesSection,
  PrivacySection,
} from './settings/sections'

interface Category {
  id: SettingsSectionId
  label: string
  icon: LucideIcon
  component: () => React.ReactNode
}

// The Developer Preview only exists in development builds.
const SHOW_DEVELOPER_PREVIEW = import.meta.env.DEV

const categories: Category[] = [
  { id: 'account', label: 'Account', icon: SquareUser, component: AccountSection },
  { id: 'appearance', label: 'Appearance', icon: Paintbrush, component: AppearanceSection },
  { id: 'notifications', label: 'Notifications', icon: Bell, component: NotificationsSection },
  { id: 'applications', label: 'Applications', icon: LayoutGrid, component: ApplicationsSection },
  { id: 'ai', label: 'NEXUS AI', icon: Sparkles, component: AISection },
  { id: 'network', label: 'Network', icon: Wifi, component: NetworkSection },
  { id: 'privacy', label: 'Privacy & Security', icon: Lock, component: PrivacySection },
  { id: 'accessibility', label: 'Accessibility', icon: Accessibility, component: AccessibilitySection },
  { id: 'devices', label: 'Devices', icon: Monitor, component: DevicesSection },
  { id: 'policies', label: 'School Policies', icon: ShieldCheck, component: PoliciesSection },
  { id: 'about', label: 'About This Computer', icon: Info, component: AboutSection },
  ...(SHOW_DEVELOPER_PREVIEW
    ? [{ id: 'developer' as const, label: 'Developer Preview', icon: Wrench, component: DeveloperPreview }]
    : []),
]

export function SettingsApp() {
  const { settingsSection, setSettingsSection } = useNexus()
  const active = categories.find((category) => category.id === settingsSection) ?? categories[1]
  const Section = active.component

  return (
    <div className="app app--split settings-app">
      <nav className="app-sidebar settings-app__nav" aria-label="Settings categories">
        {categories.map((category) => {
          const Icon = category.icon
          return (
            <button
              key={category.id}
              type="button"
              className={[
                'app-sidebar__item',
                category.id === active.id && 'is-active',
                category.id === 'developer' && 'settings-app__dev',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={category.id === active.id ? 'page' : undefined}
              onClick={() => setSettingsSection(category.id)}
            >
              <Icon size={15} strokeWidth={1.9} />
              {category.label}
            </button>
          )
        })}
      </nav>

      {/* Keyed so each category scrolls from the top and fades in. */}
      <div className="settings-app__content" key={active.id}>
        <h2 className="settings-app__title">{active.label}</h2>
        <Section />
      </div>
    </div>
  )
}
