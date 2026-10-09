// The bridge to the native NEXUS runtime for starting Linux applications.
//
// Nothing can start a native program yet: the web build has no native layer at
// all, and the macOS development host (native/) only provides the Chromium
// engine. So launchNativeApp always reports honestly that it could not start
// the app. When the Linux system layer exists, this is the one function that
// gains a real implementation; callers already handle both outcomes.

import { hasNativeHost } from '../browser/NativeEngine'
import { type NexusApp } from '../data/apps'

export type NativeLaunchResult =
  | { started: true }
  | {
      started: false
      /** `no_runtime`: NEXUS is running in a web browser. `unsupported`: the runtime can't do this yet. */
      reason: 'no_runtime' | 'unsupported'
      message: string
    }

export async function launchNativeApp(app: NexusApp): Promise<NativeLaunchResult> {
  if (!hasNativeHost()) {
    return {
      started: false,
      reason: 'no_runtime',
      message: `${app.name} is a native application and needs the native NEXUS runtime. NEXUS is running in a web browser, which can’t start programs on this computer.`,
    }
  }
  return {
    started: false,
    reason: 'unsupported',
    message: `${app.name} is a native Linux application. This development build of the NEXUS runtime provides the browser engine only, and can’t start native applications yet.`,
  }
}
