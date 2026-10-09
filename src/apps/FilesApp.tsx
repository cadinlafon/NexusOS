import {
  Clock,
  Download,
  FileText,
  Folder,
  FolderOpen,
  Home,
  Image,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import {
  fileLocations,
  filesByLocation,
  type FileItem,
  type FileLocationId,
} from '../data/appData'

const locationIcons: Record<FileLocationId, LucideIcon> = {
  home: Home,
  'my-files': FolderOpen,
  downloads: Download,
  recent: Clock,
  trash: Trash2,
}

const kindIcons: Record<FileItem['kind'], LucideIcon> = {
  folder: Folder,
  document: FileText,
  text: FileText,
  image: Image,
}

export function FilesApp() {
  const [locationId, setLocationId] = useState<FileLocationId>('home')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const location = fileLocations.find((l) => l.id === locationId)!
  const items = filesByLocation[locationId]

  const changeLocation = (id: FileLocationId) => {
    setLocationId(id)
    setSelectedId(null)
  }

  return (
    <div className="app app--split">
      <aside className="app-sidebar">
        <div className="app-sidebar__heading">Locations</div>
        {fileLocations.map((item) => {
          const Icon = locationIcons[item.id]
          return (
            <button
              key={item.id}
              type="button"
              className={`app-sidebar__item${item.id === locationId ? ' is-active' : ''}`}
              onClick={() => changeLocation(item.id)}
            >
              <Icon size={15} strokeWidth={1.9} />
              {item.label}
            </button>
          )
        })}
      </aside>

      <section className="app-main">
        <header className="app-toolbar">
          <h2 className="app-toolbar__title">{location.label}</h2>
          <span className="app-toolbar__meta">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </header>

        {items.length > 0 ? (
          <div className="file-grid" onClick={() => setSelectedId(null)}>
            {items.map((item) => {
              const Icon = kindIcons[item.kind]
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`file-tile file-tile--${item.kind}${item.id === selectedId ? ' is-selected' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    setSelectedId(item.id)
                  }}
                >
                  <span className="file-tile__icon">
                    <Icon size={26} strokeWidth={1.6} />
                  </span>
                  <span className="file-tile__name">{item.name}</span>
                  <span className="file-tile__detail">{item.detail}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="app-empty">
            <Trash2 size={26} strokeWidth={1.6} />
            <span>{location.label} is empty</span>
          </div>
        )}
      </section>
    </div>
  )
}
