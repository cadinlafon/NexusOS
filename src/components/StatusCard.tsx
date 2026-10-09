import { useNexus } from '../state/NexusContext'
import { formatPeriod } from '../state/selectors'

/**
 * The small system status area at the foot of the dock. Everything here is
 * simulated on this device; there is no server behind it yet.
 */
export function StatusCard() {
  const { currentClass, testMode, classOverride, classroomConnected, screenWatched } = useNexus()

  return (
    <div className={`status-card${testMode ? ' status-card--test' : ''}`}>
      <div className="status-card__label">
        <span className={`live-dot${currentClass ? '' : ' live-dot--idle'}`} />
        <span>Current Class</span>
      </div>
      <div className="status-card__class">
        {currentClass ? currentClass.subject.name : 'No class right now'}
      </div>
      {currentClass && (
        <div className="status-card__meta">
          {formatPeriod(currentClass.period)} · {currentClass.period.room}
          {classOverride && ' · set manually'}
        </div>
      )}

      <dl className="status-card__rows">
        <div>
          <dt>Session</dt>
          <dd>Local · simulated</dd>
        </div>
        <div>
          <dt>Classroom</dt>
          <dd title="When connected, your teacher can see which apps and pages you have open.">
            {screenWatched ? 'Screen being viewed' : classroomConnected ? 'Teacher connected' : 'Not connected'}
          </dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd className={testMode ? 'status-card__test' : undefined}>{testMode ? 'Test Mode' : 'Normal'}</dd>
        </div>
      </dl>
    </div>
  )
}
