import { type NexusApp } from '../data/apps'

interface AppIconProps {
  app: NexusApp
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const glyphSize = { sm: 12, md: 16, lg: 26, xl: 40 }

/** The rounded tile that represents an app anywhere in NEXUS. */
export function AppIcon({ app, size = 'md' }: AppIconProps) {
  const Icon = app.icon
  return (
    <span
      className={`app-icon app-icon--${size}`}
      style={{ '--tint-a': app.tint[0], '--tint-b': app.tint[1] } as React.CSSProperties}
    >
      <Icon size={glyphSize[size]} strokeWidth={2} />
    </span>
  )
}
