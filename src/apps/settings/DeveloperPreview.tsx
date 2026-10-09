import { Wrench } from 'lucide-react'
import { useState } from 'react'
import { SettingRow, SettingsGroup, Toggle } from '../../components/SettingsControls'
import { AppPrimaryAction, AppStatusBadge } from '../../components/AppActions'
import { AppIcon } from '../../components/AppIcon'
import { apps, isBuiltIn } from '../../data/apps'
import { backgrounds } from '../../data/backgrounds'
import { defaultSimulatedTime, sites, students, systemTargets, testSession } from '../../data/mockData'
import { useNexus } from '../../state/NexusContext'
import { permissionKey, permissionLabels, statusLabels } from '../../state/selectors'
import { useSettings, type ThemeChoice } from '../../state/SettingsContext'
import { type AppId, type AssignmentStatus, type PermissionState, type SystemStatus } from '../../types/nexus'

/**
 * Prototype-only controls for driving the simulated school day, the App
 * Platform and the mock system status. Only present in development builds.
 */
export function DeveloperPreview() {
  const {
    studentId,
    subjects,
    assignments,
    timeOverride,
    classOverride,
    testMode,
    currentClass,
    accessRequests,
    system,
    isInstalled,
    installApp,
    uninstallApp,
    getPermission,
    setAssignmentStatus,
    notify,
    dev,
  } = useNexus()
  const { settings, update, resetSettings } = useSettings()

  const permissionTargets = [
    ...apps.map((app) => ({ key: permissionKey('app', app.id), label: `App · ${app.name}`, appId: app.id as AppId | null })),
    ...sites.map((site) => ({ key: permissionKey('site', site.id), label: `Website · ${site.label}`, appId: null })),
    ...systemTargets.map((target) => ({ key: target.key, label: `System · ${target.label}`, appId: null })),
  ]

  const [targetKey, setTargetKey] = useState(permissionKey('app', 'vscode'))
  const [assignmentId, setAssignmentId] = useState(assignments[0]?.id ?? '')

  const target = permissionTargets.find((t) => t.key === targetKey) ?? permissionTargets[0]
  const targetApp = apps.find((app) => app.id === target.appId)
  const permission = getPermission(target.key)
  const assignment = assignments.find((a) => a.id === assignmentId) ?? assignments[0]

  return (
    <div className="dev-preview">
      <div className="dev-preview__banner">
        <span className="dev-panel__badge">
          <Wrench size={12} /> Developer Preview
        </span>
        <p>
          For testing the prototype only. Everything here is simulated on this device, and this
          category is left out of real builds.
        </p>
      </div>

      <SettingsGroup title="Session">
        <SettingRow label="Student">
          <select value={studentId} onChange={(event) => dev.setStudent(event.target.value)} aria-label="Student">
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </SettingRow>
        <SettingRow label="Current time" hint="The schedule follows this clock.">
          <select
            value={timeOverride === null ? 'real' : 'simulated'}
            onChange={(event) => dev.setTimeOverride(event.target.value === 'real' ? null : defaultSimulatedTime)}
            aria-label="Clock source"
          >
            <option value="simulated">Simulated</option>
            <option value="real">Real time</option>
          </select>
          {timeOverride !== null && (
            <input
              type="time"
              value={timeOverride}
              onChange={(event) => event.target.value && dev.setTimeOverride(event.target.value)}
              aria-label="Simulated time"
            />
          )}
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="Desktop">
        <SettingRow label="Current class" hint={`Now: ${currentClass?.subject.name ?? 'no class'}`}>
          <select
            value={classOverride ?? 'schedule'}
            onChange={(event) => dev.setClassOverride(event.target.value === 'schedule' ? null : event.target.value)}
            aria-label="Current class"
          >
            <option value="schedule">Follow the schedule</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
            <option value="none">No class</option>
          </select>
        </SettingRow>
        <SettingRow label="Mode" hint={`Test: ${testSession.title}`}>
          <div className="segmented" role="radiogroup" aria-label="Mode">
            <button type="button" role="radio" aria-checked={!testMode} onClick={() => dev.setTestMode(false)}>
              Normal
            </button>
            <button type="button" role="radio" aria-checked={testMode} onClick={() => dev.setTestMode(true)}>
              Test Mode
            </button>
          </div>
        </SettingRow>
        <SettingRow label="Theme">
          <select
            value={settings.theme}
            onChange={(event) => update({ theme: event.target.value as ThemeChoice })}
            aria-label="Theme"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </SettingRow>
        <SettingRow label="Background">
          <select
            value={settings.background}
            onChange={(event) => update({ background: event.target.value })}
            aria-label="Background"
          >
            {backgrounds.map((background) => (
              <option key={background.id} value={background.id}>
                {background.name}
              </option>
            ))}
          </select>
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="Applications and permissions">
        <SettingRow label="Target">
          <select value={target.key} onChange={(event) => setTargetKey(event.target.value)} aria-label="Permission target">
            {permissionTargets.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </SettingRow>
        {targetApp && (
          <SettingRow
            label="Installed"
            hint={isBuiltIn(targetApp) ? 'Built-in apps are always installed.' : undefined}
          >
            <Toggle
              label="Installed"
              checked={isInstalled(targetApp.id)}
              disabled={isBuiltIn(targetApp)}
              onChange={(on) => (on ? installApp(targetApp.id) : uninstallApp(targetApp.id))}
            />
          </SettingRow>
        )}
        <SettingRow
          label="Permission"
          hint={
            permission.reason === 'test_mode'
              ? `Test Mode is overriding this: ${permissionLabels[permission.state].toLowerCase()}`
              : `${accessRequests.length} access ${accessRequests.length === 1 ? 'request' : 'requests'} stored`
          }
        >
          <select
            value={permission.reason === 'test_mode' ? '' : permission.state}
            onChange={(event) => dev.setPermission(target.key, event.target.value as PermissionState)}
            disabled={permission.reason === 'test_mode'}
            aria-label="Permission state"
          >
            {permission.reason === 'test_mode' && <option value="">Set by Test Mode</option>}
            {(Object.keys(permissionLabels) as PermissionState[]).map((state) => (
              <option key={state} value={state}>
                {permissionLabels[state]}
              </option>
            ))}
          </select>
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="Developer applications">
        {apps
          .filter((app) => app.categories.includes('development'))
          .map((app) => (
            <SettingRow
              key={app.id}
              label={
                <span className="setting-line__app">
                  <AppIcon app={app} size="sm" /> {app.name}
                </span>
              }
              hint={<AppStatusBadge app={app} />}
            >
              <AppPrimaryAction app={app} />
            </SettingRow>
          ))}
      </SettingsGroup>

      <SettingsGroup title="System">
        <SettingRow label="Battery" hint={`${system.battery}%`}>
          <input
            type="range"
            min={0}
            max={100}
            value={system.battery}
            onChange={(event) => dev.setSystem({ battery: Number(event.target.value) })}
            aria-label="Battery percentage"
          />
        </SettingRow>
        <SettingRow label="Wi-Fi">
          <select
            value={system.wifi}
            onChange={(event) => dev.setSystem({ wifi: event.target.value as SystemStatus['wifi'] })}
            aria-label="Wi-Fi state"
          >
            <option value="connected">Connected</option>
            <option value="weak">Weak signal</option>
            <option value="offline">Offline</option>
          </select>
        </SettingRow>
        <SettingRow label="Do Not Disturb">
          <Toggle label="Do Not Disturb" checked={settings.doNotDisturb} onChange={(doNotDisturb) => update({ doNotDisturb })} />
        </SettingRow>
        <SettingRow label="Send a notification">
          <button type="button" className="app-button" onClick={dev.assignNewWork}>
            New assignment
          </button>
          <button type="button" className="app-button" onClick={dev.deliverTeacherMessage}>
            Teacher message
          </button>
          <button
            type="button"
            className="app-button"
            onClick={() =>
              notify({
                type: 'system',
                title: 'System notification',
                body: 'This is a test notification from Developer Preview.',
              })
            }
          >
            System notice
          </button>
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="Data">
        {assignment && (
          <SettingRow label="Assignment status">
            <select value={assignment.id} onChange={(event) => setAssignmentId(event.target.value)} aria-label="Assignment">
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
            <select
              value={assignment.status}
              onChange={(event) => setAssignmentStatus(assignment.id, event.target.value as AssignmentStatus)}
              aria-label="Assignment status"
            >
              {(Object.keys(statusLabels) as AssignmentStatus[]).map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </SettingRow>
        )}
        <SettingRow label="Reset" hint="Clears saved settings and returns all simulated data to how it started.">
          <button
            type="button"
            className="app-button app-button--danger"
            onClick={() => {
              resetSettings()
              dev.reset()
            }}
          >
            Reset prototype
          </button>
        </SettingRow>
      </SettingsGroup>
    </div>
  )
}
