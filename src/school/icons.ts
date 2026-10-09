import {
  BookOpen,
  Calculator,
  Code,
  Dumbbell,
  FlaskConical,
  Globe,
  Landmark,
  Leaf,
  Music,
  Palette,
  type LucideIcon,
} from 'lucide-react'
import { type SubjectIconId } from './types'

export const subjectIcons: Record<SubjectIconId, LucideIcon> = {
  flask: FlaskConical,
  calculator: Calculator,
  code: Code,
  book: BookOpen,
  landmark: Landmark,
  globe: Globe,
  palette: Palette,
  music: Music,
  leaf: Leaf,
  dumbbell: Dumbbell,
}

export const subjectColors = ['#34d399', '#60a5fa', '#a78bfa', '#fbbf24', '#fb923c', '#f472b6', '#22d3ee', '#f87171']
