// The shape future NEXUS AI tools will take. Nothing here is given to the
// model yet and nothing here runs: NEXUS AI can only chat.
//
// When tools arrive, the model will only be able to *ask* for one. NEXUS
// decides: every request goes through the policy check below before anything
// happens, exactly as if the student had clicked the button themselves. The
// model is never the security layer.

export type AIToolName =
  | 'getCurrentClass'
  | 'getSchedule'
  | 'getAssignments'
  | 'openApplication'
  | 'openWebsite'
  | 'createAssignment'
  | 'sendMessage'
  | 'setTimer'

export interface AIToolDefinition {
  name: AIToolName
  description: string
  /** Reading tools only look things up. Acting tools change something. */
  kind: 'read' | 'act'
  /** Who may ever be offered this tool. */
  audience: 'everyone' | 'teachers'
}

export interface AIToolCall {
  name: AIToolName
  arguments: Record<string, unknown>
}

export type AIToolDecision = { allowed: true } | { allowed: false; reason: string }

/** Supplied by NEXUS, not the model: asks the policy system whether a call may run. */
export type AIToolPolicy = (call: AIToolCall) => AIToolDecision

export const toolDefinitions: AIToolDefinition[] = [
  { name: 'getCurrentClass', description: 'The class in session now.', kind: 'read', audience: 'everyone' },
  { name: 'getSchedule', description: 'The classes for a day.', kind: 'read', audience: 'everyone' },
  { name: 'getAssignments', description: 'Open assignments and their due dates.', kind: 'read', audience: 'everyone' },
  { name: 'openApplication', description: 'Open an application the student may use.', kind: 'act', audience: 'everyone' },
  { name: 'openWebsite', description: 'Open an allowed website in NEXUS Browser.', kind: 'act', audience: 'everyone' },
  { name: 'createAssignment', description: 'Set an assignment for a class.', kind: 'act', audience: 'teachers' },
  { name: 'sendMessage', description: 'Send a message.', kind: 'act', audience: 'everyone' },
  { name: 'setTimer', description: 'Start a timer.', kind: 'act', audience: 'everyone' },
]

/** No tools are switched on. The service sends none to the model. */
export const enabledTools: AIToolDefinition[] = []
