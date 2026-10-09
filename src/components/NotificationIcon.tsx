import {
  CircleCheck,
  ClipboardList,
  Clock,
  GraduationCap,
  Info,
  Megaphone,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react'
import { type NotificationType } from '../types/nexus'

const icons: Record<NotificationType, LucideIcon> = {
  new_assignment: ClipboardList,
  due_soon: Clock,
  teacher_message: MessageCircle,
  announcement: Megaphone,
  class_starting: GraduationCap,
  assignment_submitted: CircleCheck,
  system: Info,
}

export function NotificationIcon({ type }: { type: NotificationType }) {
  const Icon = icons[type]
  return (
    <span className={`notification-icon notification-icon--${type}`}>
      <Icon size={15} strokeWidth={2} />
    </span>
  )
}
