// School policy for applications, websites and system features.
//
//   School policy → application policy → student permissions → app launcher
//
// This file is the single place policy is defined. Today it is a local mock;
// later `schoolPolicy` is what the NEXUS backend delivers to the device, and
// nothing that reads it (the launcher, the App Library, the browser) changes.

import { ALL_APP_IDS, type AppCapability, type AppId, type PermissionState } from '../types/nexus'

export interface SchoolPolicy {
  /** Decisions for specific apps. Any registered app not listed is allowed. */
  apps: Partial<Record<AppId, PermissionState>>
  /** What happens to an application NEXUS has no record of. */
  unknownApps: PermissionState
  /** Decisions for specific websites, by NEXUS site id. Unlisted sites are allowed. */
  sites: Record<string, PermissionState>
  /** System features, by id. */
  system: Record<string, PermissionState>
  /** Capabilities no application is granted, whatever it asks for. */
  deniedCapabilities: AppCapability[]
}

export const schoolPolicy: SchoolPolicy = {
  apps: {
    'android-studio': 'teacher_required',
    discord: 'blocked',
    steam: 'blocked',
  },
  unknownApps: 'blocked',
  sites: {
    youtube: 'restricted',
    games: 'blocked',
  },
  system: {
    settings: 'restricted',
  },
  deniedCapabilities: ['camera', 'microphone'],
}

/** The policy decision for a permission key such as `app:vscode` or `site:youtube`. */
export function policyFor(key: string, policy: SchoolPolicy = schoolPolicy): PermissionState {
  const separator = key.indexOf(':')
  const kind = key.slice(0, separator)
  const id = key.slice(separator + 1)

  if (kind === 'app') {
    if (!(ALL_APP_IDS as readonly string[]).includes(id)) return policy.unknownApps
    return policy.apps[id as AppId] ?? 'allowed'
  }
  if (kind === 'site') return policy.sites[id] ?? 'allowed'
  if (kind === 'system') return policy.system[id] ?? 'allowed'
  return 'allowed'
}

/** Whether school policy grants a capability an app has asked for. */
export const capabilityGranted = (capability: AppCapability, policy: SchoolPolicy = schoolPolicy) =>
  !policy.deniedCapabilities.includes(capability)

export const capabilityLabels: Record<AppCapability, string> = {
  internet: 'Internet',
  'files.read': 'Read your files',
  'files.write': 'Save files',
  camera: 'Camera',
  microphone: 'Microphone',
  notifications: 'Notifications',
  clipboard: 'Clipboard',
  'system.launch': 'Start other programs',
  'developer.tools': 'Developer tools',
}
