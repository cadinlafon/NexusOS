import { Check, Lock } from 'lucide-react'
import { useRef } from 'react'
import { testSession } from '../data/mockData'
import { useNexus } from '../state/NexusContext'
import { type ResolvedPermission } from '../types/nexus'
import { Modal } from './Modal'

const headings: Record<string, string> = {
  app: 'Application Restricted',
  site: 'Website Restricted',
  page: 'Restricted',
  system: 'Restricted',
}

function explain(permission: ResolvedPermission, testName: string) {
  if (permission.reason === 'test_mode') return `Test Mode is on for ${testName}.`
  if (permission.reason === 'class_policy') return 'Your teacher has turned it off for this class.'
  switch (permission.state) {
    case 'blocked':
      return 'It’s blocked by your school.'
    case 'teacher_required':
      return 'It needs your teacher’s approval.'
    default:
      return 'It’s restricted during school hours.'
  }
}

/** Explains why something can't be opened and lets the student ask for access. */
export function RestrictionDialog() {
  const { restriction, dismissRestriction, getPermission, getSubject, currentClass, accessRequests, requestAccess } =
    useNexus()

  // Keep the last target around so the sheet can animate out with its content.
  const lastTarget = useRef(restriction)
  if (restriction) lastTarget.current = restriction
  const target = lastTarget.current
  if (!target) return null

  const permission = getPermission(target.key)
  const kind = target.key.split(':')[0]
  const requested = accessRequests.some((request) => request.key === target.key)
  const duringTest = permission.reason === 'test_mode'
  // A test or a class only pauses things, so there is nothing to request.
  const temporary = permission.reason !== 'policy'
  const testName = `${getSubject(testSession.subjectId)?.name}: ${testSession.title}`

  return (
    <Modal open={restriction !== null} onClose={dismissRestriction} label={headings[kind]}>
      <div className="restriction">
        <span className="restriction__icon">
          <Lock size={24} />
        </span>
        <h2 className="restriction__title">{headings[kind]}</h2>
        <p className="restriction__text">
          {target.label} isn’t available right now. {explain(permission, testName)}
        </p>

        <dl className="restriction__facts">
          <div>
            <dt>Current class</dt>
            <dd>{currentClass?.subject.name ?? 'None'}</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>{duringTest ? 'Test Mode' : 'Normal'}</dd>
          </div>
        </dl>

        {temporary ? (
          <p className="restriction__note">
            It will be available again when the {duringTest ? 'test' : 'class'} ends.
          </p>
        ) : requested ? (
          <p className="restriction__note restriction__note--done">
            <Check size={14} /> Request saved on this device. Teacher approval isn’t connected yet.
          </p>
        ) : null}

        <div className="restriction__actions">
          {!temporary && !requested && (
            <button
              type="button"
              className="button button--primary"
              onClick={() => requestAccess(target.key, target.label)}
            >
              Request Access
            </button>
          )}
          <button type="button" className="button" onClick={dismissRestriction}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
