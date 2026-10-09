import { useEffect, useRef, useState } from 'react'
import { connectToRelay, postToRelay } from './relayClient'
import { startScreenShare } from './screenCapture'
import { type SchoolData } from '../school/types'
import { type ClassCommand, type ClassState, type StudentPresence } from './types'

interface StudentLink {
  /** What this desktop reports to the teacher. Re-sent whenever it changes. */
  presence: StudentPresence
  onClassState: (state: ClassState) => void
  /** The school model, whenever NEXUS Classroom has a newer one. */
  onSchool: (school: SchoolData) => void
  onCommand: (command: ClassCommand) => void
}

/**
 * Links this student desktop to NEXUS Classroom, when a teacher view is
 * running. Reports whether the link is up and whether a teacher is viewing
 * the screen, both of which the desktop shows to the student.
 */
export function useStudentLink({ presence, onClassState, onSchool, onCommand }: StudentLink) {
  const [connected, setConnected] = useState(false)
  const [watched, setWatched] = useState(false)

  // The stream outlives renders; it always calls the latest handlers.
  const handlers = useRef({ onClassState, onSchool, onCommand })
  handlers.current = { onClassState, onSchool, onCommand }

  useEffect(
    () =>
      connectToRelay('student', presence.id, ['state', 'school', 'command', 'watch'], {
        onStatus: (up) => {
          setConnected(up)
          // Nobody can be watching through a link that is down.
          if (!up) setWatched(false)
        },
        onEvent: (event, data) => {
          if (event === 'state') handlers.current.onClassState(data as ClassState)
          // Null means no teacher view has set the school up yet; keep our own copy.
          else if (event === 'school') data && handlers.current.onSchool(data as SchoolData)
          else if (event === 'watch') setWatched((data as { watching: boolean }).watching)
          else handlers.current.onCommand(data as ClassCommand)
        },
      }),
    [presence.id],
  )

  // Everything except the timestamp, so an unchanged desktop stays quiet.
  const { updatedAt: _updatedAt, ...report } = presence
  const fingerprint = JSON.stringify(report)
  useEffect(() => {
    if (connected) postToRelay('presence', { ...JSON.parse(fingerprint), updatedAt: new Date().toISOString() })
  }, [connected, fingerprint])

  // The screen is only captured while a teacher is actually viewing it.
  useEffect(() => {
    if (!connected || !watched) return
    return startScreenShare((snapshot) => postToRelay('screen', { id: presence.id, ...snapshot }))
  }, [connected, watched, presence.id])

  return { connected, watched }
}
