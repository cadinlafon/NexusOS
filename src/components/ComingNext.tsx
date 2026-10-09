import { type LucideIcon } from 'lucide-react'

interface ComingNextProps {
  icon: LucideIcon
  title: string
  /** What this area will do once it is built. */
  planned: string[]
}

/** The panel shown on pages whose real functionality hasn't been built yet. */
export function ComingNext({ icon: Icon, title, planned }: ComingNextProps) {
  return (
    <section className="coming-next glass">
      <span className="coming-next__icon">
        <Icon size={22} strokeWidth={1.8} />
      </span>
      <div className="pill">Coming next</div>
      <h2 className="coming-next__title">{title}</h2>
      <ul className="coming-next__list">
        {planned.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
