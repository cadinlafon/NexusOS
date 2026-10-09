import { Check, Lock, Wifi, WifiLow, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { useAuth, useProfile } from '../../auth/AuthProvider'
import { AppIcon } from '../../components/AppIcon'
import { NexusMark } from '../../components/NexusMark'
import { Segmented, SettingRow, SettingsGroup, Toggle } from '../../components/SettingsControls'
import { apps, appTypeLabels, getApp, isBuiltIn } from '../../data/apps'
import { accents, backgrounds } from '../../data/backgrounds'
import { school, sites, systemTargets } from '../../data/mockData'
import { capabilities, capabilityList, UNAVAILABLE_LABEL } from '../../services/ai/models'
import { getSystemInfo } from '../../services/systemInfo'
import { useNexus } from '../../state/NexusContext'
import { permissionKey, permissionLabels } from '../../state/selectors'
import {
  useSettings,
  type NotificationCategory,
  type TextSize,
  type ThemeChoice,
} from '../../state/SettingsContext'
import { type AppId } from '../../types/nexus'

const Value = ({ children }: { children: React.ReactNode }) => (
  <span className="setting-line__value">{children}</span>
)

const SimulatedNote = ({ children }: { children: React.ReactNode }) => (
  <p className="settings-note">{children}</p>
)

/* ---------- Account ---------- */

export function AccountSection() {
  const { student } = useNexus()
  const { signOut, sendPasswordReset } = useAuth()
  const profile = useProfile()
  const [resetSent, setResetSent] = useState(false)
  return (
    <>
      <div className="settings-profile">
        <span className="avatar avatar--xl">{student.initials}</span>
        <div>
          <div className="settings-profile__name">{student.name}</div>
          <div className="settings-profile__role">
            {student.role} · {school}
          </div>
        </div>
      </div>

      <SettingsGroup title="Student">
        <SettingRow label="Name">
          <Value>{student.name}</Value>
        </SettingRow>
        <SettingRow label="Student ID">
          <Value>{student.studentNumber}</Value>
        </SettingRow>
        <SettingRow label="School">
          <Value>{school}</Value>
        </SettingRow>
        <SettingRow label="Grade">
          <Value>{student.grade}</Value>
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="Sign-in">
        <SettingRow label="Email">
          <Value>{profile.email}</Value>
        </SettingRow>
        <SettingRow
          label="Password"
          hint={resetSent ? `A reset link was sent to ${profile.email}.` : 'We’ll email you a link to choose a new one.'}
        >
          <button
            type="button"
            className="app-button"
            disabled={resetSent}
            onClick={() => void sendPasswordReset(profile.email).then(() => setResetSent(true), () => {})}
          >
            {resetSent ? 'Sent' : 'Reset Password'}
          </button>
        </SettingRow>
        <SettingRow label="Sign out" hint="You’ll return to NEXUS Login.">
          <button type="button" className="app-button" onClick={() => void signOut()}>
            Sign Out
          </button>
        </SettingRow>
      </SettingsGroup>
      <SimulatedNote>
        Your name and email come from your NEXUS account. Student ID, grade and timetable are still example school
        data.
      </SimulatedNote>
    </>
  )
}

/* ---------- Appearance ---------- */

const themeOptions: { id: ThemeChoice; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
]

export function AppearanceSection() {
  const { settings, resolvedTheme, update } = useSettings()

  return (
    <>
      <SettingsGroup title="Theme">
        <SettingRow label="Appearance" hint="System follows this computer’s light or dark setting.">
          <Segmented
            label="Theme"
            value={settings.theme}
            options={themeOptions}
            onChange={(theme) => update({ theme })}
          />
        </SettingRow>
        <SettingRow label="Accent color">
          <div className="swatches" role="radiogroup" aria-label="Accent color">
            {accents.map((accent) => (
              <button
                key={accent.id}
                type="button"
                role="radio"
                aria-checked={settings.accent === accent.id}
                aria-label={accent.name}
                title={accent.name}
                className="swatch"
                style={{
                  background: `linear-gradient(135deg, ${accent[resolvedTheme][0]}, ${accent[resolvedTheme][1]})`,
                }}
                onClick={() => update({ accent: accent.id })}
              >
                {settings.accent === accent.id && <Check size={13} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </SettingRow>
      </SettingsGroup>

      <section className="settings-group">
        <h3 className="settings-group__title">Desktop Background</h3>
        <div className="background-grid" role="radiogroup" aria-label="Desktop background">
          {backgrounds.map((background) => {
            const palette = background[resolvedTheme]
            return (
              <button
                key={background.id}
                type="button"
                role="radio"
                aria-checked={settings.background === background.id}
                className="background-tile"
                onClick={() => update({ background: background.id })}
              >
                <span
                  className="background-tile__preview"
                  style={{
                    background: `radial-gradient(circle at 18% 12%, ${palette.glows[0]}, transparent 62%), radial-gradient(circle at 88% 48%, ${palette.glows[1]}, transparent 60%), radial-gradient(circle at 46% 108%, ${palette.glows[2]}, transparent 62%), ${palette.base}`,
                  }}
                />
                <span className="background-tile__name">{background.name}</span>
              </button>
            )
          })}
        </div>
      </section>

      <SettingsGroup title="Effects">
        <SettingRow label="Reduce motion" hint="Turns off animations and transitions.">
          <Toggle label="Reduce motion" checked={settings.reduceMotion} onChange={(reduceMotion) => update({ reduceMotion })} />
        </SettingRow>
        <SettingRow label="Transparency" hint="Glass panels let the desktop background show through.">
          <Toggle
            label="Transparency"
            checked={!settings.reduceTransparency}
            onChange={(on) => update({ reduceTransparency: !on })}
          />
        </SettingRow>
      </SettingsGroup>
    </>
  )
}

/* ---------- Notifications ---------- */

const notificationRows: { id: NotificationCategory; label: string; hint: string }[] = [
  { id: 'assignments', label: 'Assignment notifications', hint: 'New work, due dates and submissions.' },
  { id: 'messages', label: 'Message notifications', hint: 'Messages from your teachers.' },
  { id: 'calendar', label: 'Calendar notifications', hint: 'Classes starting.' },
  { id: 'system', label: 'System notifications', hint: 'Announcements and system notices.' },
]

export function NotificationsSection() {
  const { settings, update } = useSettings()
  return (
    <>
      <SettingsGroup>
        <SettingRow
          label="Do Not Disturb"
          hint="Notifications still arrive in the bell, but nothing pops up on the desktop."
        >
          <Toggle label="Do Not Disturb" checked={settings.doNotDisturb} onChange={(doNotDisturb) => update({ doNotDisturb })} />
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="Show on the desktop" description="Choose which notifications pop up as they arrive.">
        {notificationRows.map((row) => (
          <SettingRow key={row.id} label={row.label} hint={row.hint}>
            <Toggle
              label={row.label}
              checked={settings.notifications[row.id]}
              disabled={settings.doNotDisturb}
              onChange={(on) => update({ notifications: { ...settings.notifications, [row.id]: on } })}
            />
          </SettingRow>
        ))}
      </SettingsGroup>
    </>
  )
}

/* ---------- Applications ---------- */

const defaultApps: { task: string; app: AppId }[] = [
  { task: 'Documents', app: 'docs' },
  { task: 'Web links', app: 'browser' },
  { task: 'Files and folders', app: 'files' },
  { task: 'Calculations', app: 'calculator' },
]

export function ApplicationsSection() {
  const { installedApps, openCatalog, launchApp, uninstallApp, getPermission } = useNexus()
  const installed = apps.filter((app) => installedApps.includes(app.id))
  const limited = apps.filter((app) => getPermission(permissionKey('app', app.id)).state !== 'allowed')

  return (
    <>
      <SettingsGroup>
        <SettingRow label="App Library" hint="Find, install and manage applications.">
          <button type="button" className="app-button app-button--primary" onClick={() => openCatalog()}>
            Open Applications
          </button>
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title={`Installed apps (${installed.length})`}>
        {installed.map((app) => (
          <SettingRow
            key={app.id}
            label={
              <span className="setting-line__app">
                <AppIcon app={app} size="sm" /> {app.name}
              </span>
            }
            hint={appTypeLabels[app.type]}
          >
            <button type="button" className="app-button" onClick={() => launchApp(app.id)}>
              Open
            </button>
            {!isBuiltIn(app) && (
              <button type="button" className="app-button app-button--danger" onClick={() => uninstallApp(app.id)}>
                Remove
              </button>
            )}
          </SettingRow>
        ))}
      </SettingsGroup>

      <SettingsGroup title="Default applications" description="Set by NEXUS for now.">
        {defaultApps.map(({ task, app }) => (
          <SettingRow key={task} label={task}>
            <Value>
              <span className="setting-line__app">
                <AppIcon app={getApp(app)} size="sm" /> {getApp(app).name}
              </span>
            </Value>
          </SettingRow>
        ))}
      </SettingsGroup>

      <SettingsGroup title="Permissions" description="Apps your school limits right now.">
        {limited.length === 0 && <SettingRow label="No apps are limited." />}
        {limited.map((app) => (
          <SettingRow key={app.id} label={app.name}>
            <span className="pill pill--muted">
              <Lock size={11} /> {permissionLabels[getPermission(permissionKey('app', app.id)).state]}
            </span>
          </SettingRow>
        ))}
      </SettingsGroup>
    </>
  )
}

/* ---------- NEXUS AI ---------- */

export function AISection() {
  const { settings, update } = useSettings()
  const { getPermission, launchApp } = useNexus()

  const allowed = getPermission(permissionKey('app', 'nexus-ai')).state === 'allowed'
  const chatModels = capabilities.chat.models
  // A choice saved before the model list changed no longer counts.
  const chosen = chatModels.some((model) => model.id === settings.aiModel) ? settings.aiModel! : ''

  return (
    <>
      <SettingsGroup title="Chat model" description="The model Chat tries first. A change applies to your next message.">
        <SettingRow
          label="Model"
          hint={
            chosen
              ? 'If it is busy, NEXUS AI uses the other one and says so.'
              : `${chatModels[0].name}, then ${chatModels.slice(1).map((m) => m.name).join(', ')} if it is busy.`
          }
        >
          <select
            className="settings-select--wide"
            aria-label="NEXUS AI chat model"
            value={chosen}
            onChange={(event) => update({ aiModel: event.target.value || null })}
          >
            <option value="">Automatic</option>
            {chatModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </SettingRow>
        <SettingRow label="Status" hint={allowed ? 'Available' : 'Unavailable during this activity'}>
          <button type="button" className="app-button" onClick={() => launchApp('nexus-ai')}>
            Open NEXUS AI
          </button>
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="What NEXUS AI can do" description="Free models only. NEXUS AI never switches to a paid one.">
        {capabilityList
          .filter((capability) => capability.audience === 'everyone')
          .map((capability) => (
            <SettingRow
              key={capability.id}
              label={capability.label}
              hint={capability.available ? capability.models.map((m) => m.name).join(', ') : `${UNAVAILABLE_LABEL}. ${capability.unavailable}`}
            >
              <Value>{capability.available ? 'On' : 'Unavailable'}</Value>
            </SettingRow>
          ))}
      </SettingsGroup>
    </>
  )
}

/* ---------- Network ---------- */

const wifiText = {
  connected: { status: 'Connected', signal: 'Excellent', icon: Wifi },
  weak: { status: 'Connected', signal: 'Weak', icon: WifiLow },
  offline: { status: 'Not connected', signal: 'None', icon: WifiOff },
} as const

export function NetworkSection() {
  const { system } = useNexus()
  const info = getSystemInfo()
  const wifi = wifiText[system.wifi]
  const Icon = wifi.icon

  return (
    <>
      <div className={`settings-hero${system.wifi === 'offline' ? ' is-off' : ''}`}>
        <span className="settings-hero__icon">
          <Icon size={26} />
        </span>
        <div>
          <div className="settings-hero__title">Wi-Fi</div>
          <div className="settings-hero__detail">{wifi.status}</div>
        </div>
      </div>

      <SettingsGroup>
        <SettingRow label="Network">
          <Value>{system.wifi === 'offline' ? 'None' : info.networkName}</Value>
        </SettingRow>
        <SettingRow label="Signal">
          <Value>{wifi.signal}</Value>
        </SettingRow>
        <SettingRow label="Safe Browsing">
          <Value>On · set by your school</Value>
        </SettingRow>
      </SettingsGroup>
      <SimulatedNote>
        Network status is simulated. This prototype doesn’t read the real connection.
      </SimulatedNote>
    </>
  )
}

/* ---------- Privacy & Security ---------- */

export function PrivacySection() {
  const { settings, update } = useSettings()
  const { getPermission, showRestriction, setSettingsSection } = useNexus()
  const limitedApps = apps.filter((app) => getPermission(permissionKey('app', app.id)).state !== 'allowed')
  const setPrivacy = (key: keyof typeof settings.privacy, on: boolean) =>
    update({ privacy: { ...settings.privacy, [key]: on } })

  return (
    <>
      <SettingsGroup title="Managed by your school">
        <SettingRow label="School policy">
          <Value>Active</Value>
        </SettingRow>
        <SettingRow label="Device management">
          <Value>Managed by {school}</Value>
        </SettingRow>
        <SettingRow
          label="App permissions"
          hint={`${limitedApps.length} ${limitedApps.length === 1 ? 'app is' : 'apps are'} limited.`}
        >
          <button type="button" className="app-button" onClick={() => setSettingsSection('applications')}>
            View
          </button>
        </SettingRow>
        {systemTargets.map((target) => {
          const state = getPermission(target.key).state
          return (
            <SettingRow key={target.key} label={target.label} hint="Low-level device settings.">
              {state === 'allowed' ? (
                <Value>Allowed</Value>
              ) : (
                <button type="button" className="app-button" onClick={() => showRestriction(target.key, target.label)}>
                  <Lock size={12} /> {permissionLabels[state]}
                </button>
              )}
            </SettingRow>
          )
        })}
      </SettingsGroup>

      <SettingsGroup title="Website permissions">
        {sites.map((site) => (
          <SettingRow key={site.id} label={site.label}>
            <Value>{permissionLabels[getPermission(permissionKey('site', site.id)).state]}</Value>
          </SettingRow>
        ))}
      </SettingsGroup>

      <SettingsGroup title="Hardware access" description="Whether apps may ask to use these.">
        <SettingRow label="Camera">
          <Toggle label="Camera" checked={settings.privacy.camera} onChange={(on) => setPrivacy('camera', on)} />
        </SettingRow>
        <SettingRow label="Microphone">
          <Toggle label="Microphone" checked={settings.privacy.microphone} onChange={(on) => setPrivacy('microphone', on)} />
        </SettingRow>
        <SettingRow label="Location">
          <Toggle label="Location" checked={settings.privacy.location} onChange={(on) => setPrivacy('location', on)} />
        </SettingRow>
      </SettingsGroup>
      <SimulatedNote>
        These switches are saved but don’t control real hardware yet.
      </SimulatedNote>
    </>
  )
}

/* ---------- Accessibility ---------- */

const textSizes: { id: TextSize; label: string }[] = [
  { id: 'default', label: 'Default' },
  { id: 'large', label: 'Large' },
  { id: 'larger', label: 'Larger' },
]

export function AccessibilitySection() {
  const { settings, update } = useSettings()
  return (
    <>
      <SettingsGroup title="Vision">
        <SettingRow label="Larger text" hint="Makes text and controls bigger across NEXUS.">
          <Segmented
            label="Text size"
            value={settings.textSize}
            options={textSizes}
            onChange={(textSize) => update({ textSize })}
          />
        </SettingRow>
        <SettingRow label="Increased contrast" hint="Stronger text and borders.">
          <Toggle
            label="Increased contrast"
            checked={settings.increasedContrast}
            onChange={(increasedContrast) => update({ increasedContrast })}
          />
        </SettingRow>
        <SettingRow label="Reduce motion" hint="Turns off animations and transitions.">
          <Toggle label="Reduce motion" checked={settings.reduceMotion} onChange={(reduceMotion) => update({ reduceMotion })} />
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="Interaction">
        <SettingRow label="Keyboard navigation" hint="Tab moves between controls, and focus is always outlined.">
          <Value>On</Value>
        </SettingRow>
        <SettingRow label="Screen reader" hint="A built-in screen reader isn’t available yet.">
          <Toggle label="Screen reader" checked={false} onChange={() => {}} disabled />
        </SettingRow>
      </SettingsGroup>
    </>
  )
}

/* ---------- Devices ---------- */

export function DevicesSection() {
  const info = getSystemInfo()
  return (
    <>
      <SettingsGroup>
        <SettingRow label="Computer name">
          <Value>{info.deviceName}</Value>
        </SettingRow>
        {info.devices.map((device) => (
          <SettingRow key={device.label} label={device.label}>
            <Value>{device.value}</Value>
          </SettingRow>
        ))}
      </SettingsGroup>
      <SimulatedNote>
        Placeholder values. NEXUS will list real hardware once it runs on its own system layer.
      </SimulatedNote>
    </>
  )
}

/* ---------- School Policies ---------- */

export function PoliciesSection() {
  const info = getSystemInfo()
  const { testMode } = useNexus()
  return (
    <>
      <div className="settings-hero">
        <span className="settings-hero__icon settings-hero__icon--ok">
          <Check size={26} />
        </span>
        <div>
          <div className="settings-hero__title">School Policy</div>
          <div className="settings-hero__detail">Managed by {school}</div>
        </div>
      </div>

      <SettingsGroup>
        {info.policies.map((policy) => (
          <SettingRow
            key={policy}
            label={
              <span className="setting-line__app">
                <Check size={14} className="policy-check" /> {policy}
              </span>
            }
          >
            {policy.startsWith('Test Mode') && <Value>{testMode ? 'Running now' : 'Not running'}</Value>}
          </SettingRow>
        ))}
      </SettingsGroup>
      <SimulatedNote>
        {school} is a stand-in. This prototype isn’t connected to a real school.
      </SimulatedNote>
    </>
  )
}

/* ---------- About This Computer ---------- */

export function AboutSection() {
  const info = getSystemInfo()
  const { student } = useNexus()
  return (
    <>
      <div className="about-hero">
        <NexusMark size={64} />
        <div className="about-hero__name">{info.osName}</div>
        <div className="about-hero__version">Version {info.osVersion}</div>
      </div>

      <SettingsGroup title="This computer">
        <SettingRow label="Device name">
          <Value>{info.deviceName}</Value>
        </SettingRow>
        <SettingRow label="Processor">
          <Value>{info.processor}</Value>
        </SettingRow>
        <SettingRow label="Memory">
          <Value>{info.memory}</Value>
        </SettingRow>
        <SettingRow label="Storage">
          <Value>{info.storage}</Value>
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="NEXUS">
        <SettingRow label="NEXUS Desktop">
          <Value>Version {info.desktopVersion}</Value>
        </SettingRow>
        <SettingRow label="Student">
          <Value>{student.name}</Value>
        </SettingRow>
        <SettingRow label="School">
          <Value>{school}</Value>
        </SettingRow>
      </SettingsGroup>
      <SimulatedNote>
        Hardware details are placeholders until NEXUS can read them from the system.
      </SimulatedNote>
    </>
  )
}
