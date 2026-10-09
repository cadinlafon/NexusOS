import { useRef } from 'react'
import { getApp } from '../data/apps'
import { useNexus } from '../state/NexusContext'
import { AppIcon } from './AppIcon'
import { Modal } from './Modal'

/** Shown when the launcher could not start an application, with the real reason. */
export function LaunchNoticeDialog() {
  const { launchNotice, dismissLaunchNotice, openCatalog } = useNexus()

  // Keep the last notice so the sheet can animate out with its content.
  const last = useRef(launchNotice)
  if (launchNotice) last.current = launchNotice
  const notice = last.current
  if (!notice) return null
  const app = getApp(notice.appId)

  return (
    <Modal open={launchNotice !== null} onClose={dismissLaunchNotice} label="Native application unavailable">
      <div className="restriction">
        <AppIcon app={app} size="lg" />
        <h2 className="restriction__title">Native application unavailable</h2>
        <p className="restriction__text">{notice.message}</p>
        <p className="restriction__note">Nothing was started.</p>
        <div className="restriction__actions">
          <button
            type="button"
            className="button"
            onClick={() => {
              dismissLaunchNotice()
              openCatalog(app.id)
            }}
          >
            App Details
          </button>
          <button type="button" className="button button--primary" onClick={dismissLaunchNotice}>
            OK
          </button>
        </div>
      </div>
    </Modal>
  )
}
