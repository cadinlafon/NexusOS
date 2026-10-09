import { Search } from 'lucide-react'
import { useState } from 'react'
import { appCategories, categoryLabel, getApp, searchApps, type AppCategory } from '../data/apps'
import { useNexus } from '../state/NexusContext'
import { AppPrimaryAction, AppStatusBadge, FavoriteButton } from './AppActions'
import { useAppMenu } from './AppContextMenu'
import { AppIcon } from './AppIcon'

/** The App Library: every application in the registry, searchable and filterable. */
export function AppCatalog() {
  const { subjects, recents, launchApp, setCatalogFocus } = useNexus()
  const openMenu = useAppMenu()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<AppCategory | 'all'>('all')

  const subjectNames = Object.fromEntries(subjects.map((subject) => [subject.id, subject.name]))
  const results = searchApps(query, subjectNames).filter(
    (app) => category === 'all' || app.categories.includes(category),
  )
  const browsing = !query.trim() && category === 'all'

  return (
    <div className="app catalog">
      <header className="catalog__header">
        <div>
          <h2 className="catalog__title">Applications</h2>
          <p className="catalog__subtitle">Everything available on this computer.</p>
        </div>
        <label className="catalog__search">
          <Search size={14} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search applications"
            aria-label="Search applications"
            spellCheck={false}
          />
        </label>
      </header>

      <div className="catalog__filters" role="tablist" aria-label="Category">
        {appCategories.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={category === item.id}
            className="catalog__filter"
            onClick={() => setCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="catalog__scroll">
        {browsing && recents.length > 0 && (
          <section className="catalog__recent" aria-label="Recent applications">
            <h3 className="catalog__heading">Recent</h3>
            <div className="catalog__recent-row">
              {recents.map(getApp).map((app) => (
                <button
                  key={app.id}
                  type="button"
                  className="recent-app"
                  onClick={() => launchApp(app.id)}
                  onContextMenu={(event) => openMenu(event, app.id)}
                  title={`Open ${app.name}`}
                >
                  <AppIcon app={app} size="lg" />
                  <span>{app.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {browsing && <h3 className="catalog__heading">All applications</h3>}
        <ul className="catalog__grid">
          {results.map((app) => (
            <li key={app.id} className="app-card" onContextMenu={(event) => openMenu(event, app.id)}>
              <button
                type="button"
                className="app-card__main"
                onClick={() => setCatalogFocus(app.id)}
                aria-label={`${app.name} details`}
              >
                <AppIcon app={app} size="lg" />
                <span className="app-card__text">
                  <span className="app-card__name">{app.name}</span>
                  <span className="app-card__category">{categoryLabel(app.categories[0])}</span>
                </span>
              </button>
              <p className="app-card__description">{app.description}</p>
              <div className="app-card__footer">
                <AppStatusBadge app={app} />
                <span className="app-card__actions">
                  <FavoriteButton app={app} />
                  <AppPrimaryAction app={app} />
                </span>
              </div>
            </li>
          ))}
        </ul>
        {results.length === 0 && (
          <div className="app-empty">No applications match {query.trim() ? `“${query.trim()}”` : 'this category'}.</div>
        )}
      </div>
    </div>
  )
}
