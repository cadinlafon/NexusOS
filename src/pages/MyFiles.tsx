import { FolderOpen } from 'lucide-react'
import { ComingNext } from '../components/ComingNext'
import { PageHeader } from '../components/PageHeader'
import { useNexus } from '../state/NexusContext'

export function MyFiles() {
  const { launchApp } = useNexus()

  return (
    <div className="page">
      <PageHeader
        eyebrow="My Files"
        title="Your school files"
        description="Your school files, synced with your NEXUS account."
      />

      <div>
        <button type="button" className="button" onClick={() => launchApp('files')}>
          Open the Files app
        </button>
      </div>

      <ComingNext
        icon={FolderOpen}
        title="Files functionality"
        planned={[
          'A folder for every subject, created for you',
          'Files that follow you to any NEXUS device',
          'Open anything straight into the right NEXUS app',
        ]}
      />
    </div>
  )
}
