// System information for Settings. Every value here is a placeholder: the
// prototype runs in a browser and cannot see real hardware. When the Linux
// system layer exists, this is the one function to reimplement.

export interface SystemInfo {
  osName: string
  osVersion: string
  desktopVersion: string
  deviceName: string
  processor: string
  memory: string
  storage: string
  networkName: string
  devices: { label: string; value: string }[]
  policies: string[]
}

export function getSystemInfo(): SystemInfo {
  return {
    osName: 'NEXUS OS',
    osVersion: '0.7 Preview',
    desktopVersion: '0.7',
    deviceName: 'NEXUS-042',
    processor: 'Prototype CPU',
    memory: 'Prototype Memory',
    storage: 'Prototype Storage',
    networkName: 'NEXUS-School',
    devices: [
      { label: 'Display', value: 'Built-in display' },
      { label: 'Keyboard', value: 'Built-in keyboard' },
      { label: 'Mouse', value: 'Built-in trackpad' },
      { label: 'Camera', value: 'Built-in camera' },
      { label: 'Microphone', value: 'Built-in microphone' },
      { label: 'Audio', value: 'Built-in speakers' },
    ],
    policies: ['Device Managed', 'Safe Browsing', 'App Restrictions', 'Test Mode Available'],
  }
}
