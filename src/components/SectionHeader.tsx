interface SectionHeaderProps {
  eyebrow: string
  title: string
}

export function SectionHeader({ eyebrow, title }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div className="eyebrow">{eyebrow}</div>
      <h2 className="section-header__title">{title}</h2>
    </div>
  )
}
