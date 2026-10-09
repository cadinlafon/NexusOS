import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  detail: string
  onClick?: () => void
}

export function StatCard({ icon: Icon, label, value, detail, onClick }: StatCardProps) {
  return (
    <button type="button" className="stat-card glass lift" onClick={onClick}>
      <span className="stat-card__label">
        <Icon size={15} strokeWidth={1.9} />
        {label}
      </span>
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__detail">{detail}</span>
    </button>
  )
}
