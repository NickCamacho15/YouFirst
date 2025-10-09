/**
 * Shared TypeScript types for Hevy-style workout system
 * 
 * This file contains all type definitions used across the workout feature,
 * including database models, API responses, and component props.
 * 
 * @packageDocumentation
 */

// ============================================================================
// EXERCISE LIBRARY TYPES
// ============================================================================

/**
 * Categories for organizing exercises in the library
 */
export type ExerciseCategory = 
  | 'Chest'
  | 'Back'
  | 'Legs'
  | 'Shoulders'
  | 'Arms'
  | 'Core'
  | 'Cardio'
  | 'Full Body'
  | 'Other'

/**
 * Exercise type determines what metrics are tracked during workout
 */
export type ExerciseType = 
  | 'Lifting'      // Sets, reps, weight, rest
  | 'Cardio'       // Time, distance
  | 'METCON'       // Time cap, score
  | 'Bodyweight'   // Sets, reps, rest (no weight)
  | 'Timed'        // Duration, sets, rest

/**
 * Database row from exercise_library table
 */
export interface ExerciseLibraryRow {
  id: string
  name: string
  description: string | null
  category: ExerciseCategory
  body_part: string | null
  equipment: string[] | null
  exercise_type: ExerciseType
  default_sets: number
  default_reps: number
  default_rest_seconds: number
  thumbnail_url: string | null
  video_url: string | null
  instructions: string | null
  is_custom: boolean
  created_by: string | null
  group_id: string | null
  created_at: string
}

/**
 * Exercise library item for UI display
 */
export interface ExerciseLibraryItem extends ExerciseLibraryRow {
  // Computed/display fields
  isSelected?: boolean
  isPremium?: boolean
}

/**
 * Filters for exercise library search
 */
export interface ExerciseFilters {
  search?: string
  category?: ExerciseCategory | 'all'
  bodyPart?: string | 'all'
  equipment?: string[]
  exerciseType?: ExerciseType | 'all'
  customOnly?: boolean
}

// ============================================================================
// WORKOUT TEMPLATE TYPES
// ============================================================================

/**
 * Template status for draft/publish workflow
 */
export type TemplateStatus = 'draft' | 'published' | 'archived'

/**
 * Database row from training_plans table
 */
export interface WorkoutTemplateRow {
  id: string
  user_id: string
  name: string
  description: string | null
  status: TemplateStatus
  is_active: boolean
  start_date: string
  created_at: string
}

/**
 * Template with exercise details for display
 */
export interface WorkoutTemplate extends WorkoutTemplateRow {
  exercises: TemplateExercise[]
  exercise_count?: number
  assignment_count?: number
}

/**
 * Exercise in a template
 * Extends plan_exercises table with library reference
 */
export interface TemplateExercise {
  id: string                           // plan_exercise_id
  plan_id: string
  exercise_library_id: string | null   // Link to exercise_library
  block_id: string | null              // null for simplified templates
  
  // Exercise details (from library or custom)
  name: string
  type: ExerciseType
  
  // Configuration
  sets: number
  reps: number | null
  weight: number | null
  rest_seconds: number
  
  // Cardio/METCON specific
  time_seconds: number | null
  distance_m: number | null
  pace_sec_per_km: number | null
  time_cap_seconds: number | null
  score_type: string | null
  target_score: string | null
  
  // Metadata
  notes: string | null
  position: number
  created_at: string
}

/**
 * Config for a single exercise in template
 * Used when editing exercise settings
 */
export interface ExerciseConfig {
  sets: number
  reps?: number
  weight?: number
  rest_seconds: number
  time_seconds?: number
  distance_m?: number
  pace_sec_per_km?: number
  time_cap_seconds?: number
  score_type?: string
  target_score?: string
  notes?: string
}

/**
 * Data for creating a new template exercise from library
 */
export interface CreateTemplateExercise {
  exercise_library_id: string
  name: string
  type: ExerciseType
  sets: number
  reps?: number
  weight?: number
  rest_seconds: number
  position: number
}

// ============================================================================
// WORKOUT SESSION TYPES (EXECUTION)
// ============================================================================

/**
 * Workout session status
 */
export type SessionStatus = 'in_progress' | 'completed' | 'aborted'

/**
 * Database row from workout_sessions table
 */
export interface WorkoutSessionRow {
  id: string
  user_id: string
  plan_id: string | null
  plan_day_id: string | null
  session_date: string
  started_at: string
  ended_at: string | null
  total_seconds: number | null
  status: SessionStatus
  blocks_completed: number | null
  exercises_completed: number | null
}

/**
 * Full workout session with exercises for active workout UI
 */
export interface WorkoutSession extends WorkoutSessionRow {
  template_name: string
  exercises: SessionExercise[]
}

/**
 * Exercise in an active workout session
 * Snapshot of template exercise at workout start
 */
export interface SessionExercise {
  id: string                     // session_exercise_id
  session_id: string
  plan_exercise_id: string | null
  name: string
  type: ExerciseType
  category: string | null        // Display only
  order_index: number
  
  // Timestamps
  started_at: string | null
  completed_at: string | null
  
  // Target values (from template)
  target_sets: number | null
  target_reps: number | null
  target_weight: number | null
  target_rest_seconds: number | null
  target_time_seconds: number | null
  target_distance_m: number | null
  
  // Set logs
  sets: SessionSet[]
}

/**
 * Single set within an exercise
 * Stored in set_logs table
 */
export interface SessionSet {
  id: string
  session_exercise_id: string
  set_index: number
  
  // Target values
  target_reps: number | null
  target_weight: number | null
  target_time_seconds: number | null
  target_distance_m: number | null
  
  // Actual performance
  actual_reps: number | null
  actual_weight: number | null
  actual_time_seconds: number | null
  actual_distance_m: number | null
  actual_score: string | null
  
  // Rest
  rest_seconds_actual: number | null
  
  // Timestamp
  completed_at: string | null
  
  // Previous performance (for display)
  previous_reps?: number | null
  previous_weight?: number | null
}

/**
 * Data for completing a set
 */
export interface CompleteSetParams {
  sessionExerciseId: string
  setIndex: number
  actuals?: {
    reps?: number
    weight?: number
    time_seconds?: number
    distance_m?: number
    pace_sec_per_km?: number
    score?: string
  }
  rest_seconds?: number
}

/**
 * Snapshot of exercises for creating a session
 * Used to create session_exercises from template
 */
export interface SnapshotExercise {
  plan_exercise_id: string | null
  name: string
  type: ExerciseType
  order_index: number
  targets: {
    sets?: number
    reps?: number
    weight?: number
    rest_seconds?: number
    time_seconds?: number
    distance_m?: number
    pace_sec_per_km?: number
    time_cap_seconds?: number
    score_type?: string
    score?: string
  }
}

// ============================================================================
// WORKOUT ASSIGNMENT TYPES
// ============================================================================

/**
 * Schedule type for workout assignments
 */
export type ScheduleType = 'immediate' | 'once' | 'weekly'

/**
 * Scheduling parameters for workout assignment
 */
export interface ScheduleParams {
  scheduleType: ScheduleType
  scheduledDate?: string        // For 'once'
  recurrenceDays?: number[]     // For 'weekly' (0=Sun, 6=Sat)
  startDate?: string            // For 'weekly'
  endDate?: string              // For 'weekly', optional
}

/**
 * Group member for assignment UI
 */
export interface GroupMember {
  id: string
  email: string
  username: string | null
  display_name: string | null
  role: string
  group_id: string
}

// ============================================================================
// STATISTICS & ANALYTICS TYPES
// ============================================================================

/**
 * Workout statistics for dashboard
 */
export interface WorkoutStats {
  totalWorkouts: number
  avgDurationMins: number
  currentStreakDays: number
  totalVolumeThisWeek: number
}

/**
 * Exercise performance history
 */
export interface ExerciseHistory {
  exercise_name: string
  dates: string[]
  weights: number[]
  reps: number[]
  volume: number[]            // weight * reps * sets
}

/**
 * Personal record for an exercise
 */
export interface PersonalRecord {
  exercise_name: string
  weight: number
  reps: number
  date: string
  estimated_1rm: number
}

// ============================================================================
// UI COMPONENT PROPS
// ============================================================================

/**
 * Props for ExerciseLibraryModal
 */
export interface ExerciseLibraryModalProps {
  visible: boolean
  onClose: () => void
  onSelectExercises: (exercises: ExerciseLibraryItem[]) => void
  allowMultiSelect?: boolean
  preSelectedIds?: string[]
}

/**
 * Props for ExerciseConfigModal
 */
export interface ExerciseConfigModalProps {
  visible: boolean
  exercise: TemplateExercise
  onSave: (config: ExerciseConfig) => void
  onClose: () => void
}

/**
 * Props for EnhancedWorkoutBuilderModal
 */
export interface EnhancedWorkoutBuilderModalProps {
  visible: boolean
  onClose: () => void
  onSave: (template: WorkoutTemplate) => Promise<void>
  templateId?: string
  mode: 'create' | 'edit'
}

/**
 * Props for ActiveWorkoutScreen
 */
export interface ActiveWorkoutScreenProps {
  session: WorkoutSession
  onFinish: () => Promise<void>
  onCancel: () => void
}

/**
 * Props for TemplateExerciseCard
 */
export interface TemplateExerciseCardProps {
  exercise: TemplateExercise
  onEdit: () => void
  onRemove: () => void
  onReorder?: () => void
  isDragging?: boolean
}

/**
 * Props for RestTimer
 */
export interface RestTimerProps {
  duration: number              // in seconds
  onComplete: () => void
  onSkip: () => void
  onExtend: (seconds: number) => void
  visible: boolean
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Weight unit preference
 */
export type WeightUnit = 'lbs' | 'kg'

/**
 * Distance unit preference
 */
export type DistanceUnit = 'mi' | 'km' | 'm'

/**
 * User preferences for workouts
 */
export interface WorkoutPreferences {
  weightUnit: WeightUnit
  distanceUnit: DistanceUnit
  autoStartRestTimer: boolean
  defaultRestSeconds: number
  playRestCompleteSound: boolean
  showPreviousPerformance: boolean
}

/**
 * Validation error for forms
 */
export interface ValidationError {
  field: string
  message: string
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if exercise is a lifting exercise
 */
export function isLiftingExercise(exercise: { type: ExerciseType }): boolean {
  return exercise.type === 'Lifting' || exercise.type === 'Bodyweight'
}

/**
 * Check if exercise is cardio
 */
export function isCardioExercise(exercise: { type: ExerciseType }): boolean {
  return exercise.type === 'Cardio'
}

/**
 * Check if exercise is timed
 */
export function isTimedExercise(exercise: { type: ExerciseType }): boolean {
  return exercise.type === 'Timed'
}

/**
 * Check if template is simplified (no blocks)
 */
export function isSimplifiedTemplate(template: WorkoutTemplate): boolean {
  return template.exercises.every(e => e.block_id === null)
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default rest times in seconds
 */
export const DEFAULT_REST_TIMES = {
  STRENGTH: 180,        // 3 minutes for heavy lifts
  HYPERTROPHY: 90,      // 1.5 minutes for muscle building
  ENDURANCE: 60,        // 1 minute for high reps
  CARDIO: 0,           // No rest between cardio sets
  CORE: 60,            // 1 minute for core exercises
}

/**
 * Exercise categories with colors
 */
export const CATEGORY_COLORS: Record<ExerciseCategory, string> = {
  'Chest': '#FF6B6B',
  'Back': '#4ECDC4',
  'Legs': '#95E1D3',
  'Shoulders': '#F38181',
  'Arms': '#AA96DA',
  'Core': '#FCBAD3',
  'Cardio': '#FFA07A',
  'Full Body': '#87CEEB',
  'Other': '#B8B8B8',
}

/**
 * Exercise type labels
 */
export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  'Lifting': 'Strength Training',
  'Cardio': 'Cardiovascular',
  'METCON': 'Metabolic Conditioning',
  'Bodyweight': 'Bodyweight Training',
  'Timed': 'Timed Exercise',
}

/**
 * Template status labels
 */
export const TEMPLATE_STATUS_LABELS: Record<TemplateStatus, string> = {
  'draft': 'Draft',
  'published': 'Published',
  'archived': 'Archived',
}

/**
 * Template status colors
 */
export const TEMPLATE_STATUS_COLORS: Record<TemplateStatus, string> = {
  'draft': '#F59E0B',        // Amber
  'published': '#10B981',    // Green
  'archived': '#6B7280',     // Gray
}

