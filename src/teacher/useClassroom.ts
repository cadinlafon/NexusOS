import { useCallback, useEffect, useRef, useState } from 'react'
import { connectToRelay, postToRelay } from '../classroom/relayClient'
import { type ClassCommand, type ClassState, type RosterEntry, type ScreenSnapshot } from '../classroom/types'
import { type SchoolData } from '../school/types'
import { type PermissionState } from '../types/nexus'

/** The teacher's connection to the classroom relay: who is here, and the class settings. */
export function useClassroom(teacherId: string, onSchool: (school: SchoolData | null) => void) {
  const schoolHandler = useRef(onSchool)
  schoolHandler.current = onSchool

  const [connected, setConnected] = useState(false)
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [classState, setClassState] = useState<ClassState>({ testMode: false, permissions: {} })
  /** The student whose screen this teacher has open, and its latest snapshot. */
  const [watchingId, setWatchingId] = useState<string | null>(null)
  const [screen, setScreen] = useState<ScreenSnapshot | null>(null)

  useEffect(
    () =>
      connectToRelay('teacher', teacherId, ['state', 'school', 'roster', 'screen'], {
        onStatus: setConnected,
        onEvent: (event, data) => {
          // The relay keeps the class settings, so they survive a refresh of this page.
          if (event === 'state') setClassState(data as ClassState)
          else if (event === 'screen') setScreen(data as ScreenSnapshot)
          else if (event === 'school') schoolHandler.current(data as SchoolData | null)
          else setRoster(data as RosterEntry[])
        },
      }),
    [teacherId],
  )

  const update = useCallback((next: ClassState) => {
    setClassState(next)
    postToRelay('state', next)
  }, [])

  /** Starts viewing a student's screen, or stops with `null`. The student is told either way. */
  const watch = useCallback(
    (studentId: string | null) => {
      setWatchingId(studentId)
      setScreen(null)
      postToRelay('watch', { teacherId, studentId })
    },
    [teacherId],
  )

  return {
    connected,
    watchingId,
    // Never show one student's screen under another's name.
    screen: screen && screen.id === watchingId ? screen : null,
    watch,
    roster,
    classState,
    setTestMode: (testMode: boolean) => update({ ...classState, testMode }),
    /** `null` removes the teacher's decision, returning to school policy. */
    setPermission: (key: string, state: PermissionState | null) => {
      const permissions = { ...classState.permissions }
      if (state === null) delete permissions[key]
      else permissions[key] = state
      update({ ...classState, permissions })
    },
    /** `target` is "all", one student's id, or a list of ids. */
    send: (target: string | string[], command: ClassCommand) => postToRelay('command', { target, command }),
  }
}
