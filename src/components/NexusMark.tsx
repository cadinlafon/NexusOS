import { useId } from 'react'

export function NexusMark({ size = 32 }: { size?: number }) {
  const gradientId = useId()

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="nexus-mark">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6f8dff" />
          <stop offset="1" stopColor="#a985ff" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <path
        d="M10.5 22V10l11 12V10"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
