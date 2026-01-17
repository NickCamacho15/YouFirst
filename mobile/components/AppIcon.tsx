import type React from "react"
import { Ionicons } from "@expo/vector-icons"
import {
  Flame,
  Trophy,
  Dumbbell,
  CalendarDays,
  Users,
  BookOpen,
  Target,
  Shield,
  Brain,
  type LucideIcon,
} from "lucide-react-native"

/**
 * AppIcon
 * Standardize on Lucide for "brand" icons. Ionicons are allowed only for platform-ish glyphs
 * and legacy cases that don't exist in Lucide yet.
 */
export type AppIconName =
  | "flame"
  | "trophy"
  | "dumbbell"
  | "calendar"
  | "users"
  | "book"
  | "target"
  | "shield"
  | "brain"
  | `ion:${string}`

const LUCIDE_MAP: Record<
  Exclude<AppIconName, `ion:${string}`>,
  LucideIcon
> = {
  flame: Flame,
  trophy: Trophy,
  dumbbell: Dumbbell,
  calendar: CalendarDays,
  users: Users,
  book: BookOpen,
  target: Target,
  shield: Shield,
  brain: Brain,
}

export function AppIcon({
  name,
  size = 18,
  color = "#111827",
}: {
  name: AppIconName
  size?: number
  color?: string
}) {
  if (name.startsWith("ion:")) {
    const ion = name.slice(4)
    return <Ionicons name={ion as any} size={size} color={color} />
  }
  const Cmp = LUCIDE_MAP[name]
  return <Cmp width={size} height={size} color={color} />
}

