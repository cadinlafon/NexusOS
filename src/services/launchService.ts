// The NEXUS app launcher. Every way of opening an application ends up here.
//
//   App icon → registry → planLaunch() → the right runtime
//                            ├─ nexus / system → a NEXUS window
//                            ├─ web            → a tab in NEXUS Browser (Chromium/CEF)
//                            └─ native         → the native runtime (nativeRuntime.ts)
//
// planLaunch only decides. NexusContext.launchApp carries the decision out, so
// no component ever needs to know how a particular application starts.

import { type NexusApp } from '../data/apps'
import { type ResolvedPermission } from '../types/nexus'

export type LaunchPlan =
  /** Open (or focus) the app's NEXUS window. */
  | { kind: 'window' }
  /** Open this address in NEXUS Browser. */
  | { kind: 'browser'; url: string }
  /** Ask the native runtime to start the program. */
  | { kind: 'native' }
  /** School policy doesn't allow it right now. */
  | { kind: 'restricted' }
  | { kind: 'not_installed' }

export function planLaunch(app: NexusApp, installed: boolean, permission: ResolvedPermission): LaunchPlan {
  // Policy first: an app the school blocks never reaches a runtime.
  if (permission.state !== 'allowed') return { kind: 'restricted' }
  if (!installed) return { kind: 'not_installed' }

  switch (app.type) {
    case 'nexus':
    case 'system':
      return { kind: 'window' }
    case 'web':
      return app.url ? { kind: 'browser', url: app.url } : { kind: 'not_installed' }
    case 'native':
      return { kind: 'native' }
  }
}
