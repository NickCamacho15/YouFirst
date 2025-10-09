# Hevy-Style UI Component Specifications

**Date:** October 9, 2025  
**Purpose:** Detailed UI specifications for all new workout components

---

## 🎨 Design System

### Colors

```typescript
// mobile/lib/theme.ts
export const WorkoutColors = {
  // Primary actions
  primary: '#4A90E2',        // Blue - main actions
  primaryDark: '#3A7BC8',    // Darker blue - pressed state
  primaryLight: '#EBF5FF',   // Light blue - backgrounds
  
  // Status colors
  success: '#10B981',        // Green - completed, published
  warning: '#F59E0B',        // Amber - draft, pending
  danger: '#EF4444',         // Red - delete, error
  
  // Neutral colors
  background: '#F8F9FA',     // Light gray - screen background
  card: '#FFFFFF',           // White - cards
  border: '#E0E0E0',         // Light gray - borders
  divider: '#F0F0F0',        // Very light gray - dividers
  
  // Text colors
  textPrimary: '#333333',    // Dark gray - main text
  textSecondary: '#666666',  // Medium gray - secondary text
  textTertiary: '#999999',   // Light gray - tertiary text
  textInverse: '#FFFFFF',    // White - on dark backgrounds
  
  // Exercise category colors
  chest: '#FF6B6B',          // Red
  back: '#4ECDC4',           // Teal
  legs: '#95E1D3',           // Mint
  shoulders: '#F38181',      // Pink
  arms: '#AA96DA',           // Purple
  core: '#FCBAD3',           // Light pink
  cardio: '#FFA07A',         // Coral
  fullBody: '#87CEEB',       // Sky blue
}
```

### Typography

```typescript
// mobile/lib/typography.ts
export const WorkoutTypography = {
  // Headers
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    color: WorkoutColors.textPrimary,
  },
  h2: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
    color: WorkoutColors.textPrimary,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    color: WorkoutColors.textPrimary,
  },
  
  // Body text
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: WorkoutColors.textPrimary,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
    color: WorkoutColors.textPrimary,
  },
  bodySemibold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    color: WorkoutColors.textPrimary,
  },
  
  // Small text
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: WorkoutColors.textSecondary,
  },
  captionMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    color: WorkoutColors.textSecondary,
  },
  
  // Micro text
  micro: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    color: WorkoutColors.textTertiary,
  },
  microBold: {
    fontSize: 12,
    fontWeight: '700' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
}
```

### Spacing

```typescript
// mobile/lib/spacing.ts
export const Spacing = {
  xs: 4,    // Tight spacing
  sm: 8,    // Small spacing
  md: 12,   // Medium spacing
  lg: 16,   // Large spacing
  xl: 20,   // Extra large spacing
  xxl: 24,  // 2x extra large
  xxxl: 32, // 3x extra large
}

export const BorderRadius = {
  sm: 8,    // Small radius (chips, pills)
  md: 12,   // Medium radius (cards, buttons)
  lg: 16,   // Large radius (modals)
  xl: 24,   // Extra large radius (sheets)
  full: 999, // Fully rounded (avatars, pills)
}
```

---

## 📱 Component Specifications

### 1. ExerciseLibraryModal

#### Layout
```
┌─────────────────────────────────────┐
│ ✕ New           Superset    Add (2) │ ← Header (60px)
├─────────────────────────────────────┤
│ 🔍 Search                           │ ← Search (56px)
├─────────────────────────────────────┤
│ [Any Body Part] [Any Category]  ↕︎  │ ← Filters (48px)
├─────────────────────────────────────┤
│                                   A │
│ ─ A ─────────────────────────       │
│                                   B │
│ 🏋 Ab Wheel                      ? │
│ Core                                │ ← Exercise card (72px)
│                                   C │
│ ✓ Arnold Press (Dumbbell)        ? │
│ Shoulders                           │
│                                   D │
│ ─ B ─────────────────────────       │
│                                   E │
│ 🏋 Back Extension                ? │
│ Back                                │
│                                   F │
│                                     │
│ (scrollable content)                │ ← ScrollView with alphabet
│                                     │    sections
│                                     │
│                                   Z │
└─────────────────────────────────────┘
```

#### Component Props
```typescript
interface ExerciseLibraryModalProps {
  visible: boolean
  onClose: () => void
  onSelectExercises: (exercises: ExerciseLibraryItem[]) => void
  allowMultiSelect?: boolean
  selectedExerciseIds?: string[] // Pre-selected exercises
}

interface ExerciseLibraryItem {
  id: string
  name: string
  category: string
  body_part: string | null
  exercise_type: 'Lifting' | 'Cardio' | 'METCON' | 'Bodyweight' | 'Timed'
  thumbnail_url: string | null
  default_sets: number
  default_reps: number
  default_rest_seconds: number
}
```

#### Styling
```typescript
const styles = StyleSheet.create({
  // Modal container
  modalContainer: {
    flex: 1,
    backgroundColor: WorkoutColors.background,
  },
  
  // Header
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    backgroundColor: WorkoutColors.card,
    borderBottomWidth: 1,
    borderBottomColor: WorkoutColors.border,
  },
  headerTitle: {
    ...WorkoutTypography.h3,
  },
  
  // Search bar
  searchContainer: {
    height: 56,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: WorkoutColors.card,
    borderBottomWidth: 1,
    borderBottomColor: WorkoutColors.border,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: Spacing.md,
    backgroundColor: WorkoutColors.background,
    borderRadius: BorderRadius.md,
    ...WorkoutTypography.body,
  },
  
  // Filter chips
  filterContainer: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    backgroundColor: WorkoutColors.card,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: WorkoutColors.background,
    borderWidth: 1,
    borderColor: WorkoutColors.border,
  },
  filterChipActive: {
    backgroundColor: WorkoutColors.primary,
    borderColor: WorkoutColors.primary,
  },
  filterChipText: {
    ...WorkoutTypography.captionMedium,
    color: WorkoutColors.textPrimary,
  },
  filterChipTextActive: {
    color: WorkoutColors.textInverse,
  },
  
  // Exercise list
  sectionHeader: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: WorkoutColors.background,
  },
  sectionHeaderText: {
    ...WorkoutTypography.microBold,
    color: WorkoutColors.textTertiary,
  },
  
  // Exercise card
  exerciseCard: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: WorkoutColors.card,
    borderBottomWidth: 1,
    borderBottomColor: WorkoutColors.divider,
  },
  exerciseCardSelected: {
    backgroundColor: WorkoutColors.primaryLight,
  },
  exerciseThumbnail: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: WorkoutColors.background,
    marginRight: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...WorkoutTypography.bodyMedium,
    marginBottom: 2,
  },
  exerciseCategory: {
    ...WorkoutTypography.caption,
  },
  exerciseInfoButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Quick index
  quickIndex: {
    position: 'absolute',
    right: 4,
    top: 164, // Below header + search + filters
    bottom: 0,
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickIndexLetter: {
    ...WorkoutTypography.micro,
    color: WorkoutColors.primary,
    fontWeight: '600',
    paddingVertical: 1,
  },
})
```

---

### 2. EnhancedWorkoutBuilderModal

#### Layout
```
┌─────────────────────────────────────┐
│ ✕     New Template            Save  │ ← Header (60px)
├─────────────────────────────────────┤
│                                     │
│ New Template        ⋮               │ ← Name + menu (56px)
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 💪 Arnold Press (Dumbbell)      │ │ ← Exercise card (88px)
│ │ Shoulders                       │ │
│ │ 3 sets × 10 reps @ 135 lbs      │ │
│ │ 2:00 rest                       │ │
│ │             ✏️ Edit    🗑 Remove │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🏃 Running                       │ │
│ │ Cardio                          │ │
│ │ 1 set × 30 min                  │ │
│ │             ✏️ Edit    🗑 Remove │ │
│ └─────────────────────────────────┘ │
│                                     │
│ (scrollable content)                │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │     + Add Exercises             │ │ ← Add button
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### Component Props
```typescript
interface EnhancedWorkoutBuilderModalProps {
  visible: boolean
  onClose: () => void
  onSave: (template: WorkoutTemplate) => Promise<void>
  templateId?: string // For editing existing
  mode: 'create' | 'edit'
}

interface WorkoutTemplate {
  id?: string
  name: string
  description: string | null
  status: 'draft' | 'published' | 'archived'
  exercises: TemplateExercise[]
}

interface TemplateExercise {
  id: string // plan_exercise_id if existing
  exercise_library_id: string | null
  name: string
  type: 'Lifting' | 'Cardio' | 'METCON' | 'Bodyweight' | 'Timed'
  sets: number
  reps: number | null
  weight: number | null
  rest_seconds: number
  time_seconds: number | null
  distance_m: number | null
  notes: string | null
  position: number
}
```

#### Styling
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WorkoutColors.background,
  },
  
  // Header
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    backgroundColor: WorkoutColors.card,
    borderBottomWidth: 1,
    borderBottomColor: WorkoutColors.border,
  },
  
  // Content
  scrollContent: {
    paddingVertical: Spacing.lg,
  },
  
  // Template name section
  templateNameSection: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  templateName: {
    ...WorkoutTypography.h2,
    flex: 1,
  },
  
  // Exercise card
  exerciseCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: WorkoutColors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: WorkoutColors.border,
    
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  exerciseIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: WorkoutColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...WorkoutTypography.bodySemibold,
    marginBottom: 2,
  },
  exerciseCategory: {
    ...WorkoutTypography.caption,
  },
  exerciseConfig: {
    ...WorkoutTypography.caption,
    color: WorkoutColors.textSecondary,
    marginBottom: Spacing.xs,
  },
  exerciseActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  
  // Add button
  addButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.xxxl,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: WorkoutColors.primary,
    borderRadius: BorderRadius.md,
  },
  addButtonText: {
    ...WorkoutTypography.bodySemibold,
    color: WorkoutColors.textInverse,
  },
})
```

---

### 3. ExerciseConfigModal

#### Layout
```
┌─────────────────────────────────────┐
│ ✕     Arnold Press (Dumbbell)  Save │ ← Header
├─────────────────────────────────────┤
│                                     │
│ Sets                                │
│ ┌─────────────────────────────────┐ │
│ │ 3                             ↕ │ │ ← Number input
│ └─────────────────────────────────┘ │
│                                     │
│ Reps per Set                        │
│ ┌─────────────────────────────────┐ │
│ │ 10                            ↕ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Weight (lbs)                        │
│ ┌─────────────────────────────────┐ │
│ │ 135                           ↕ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Rest Between Sets                   │
│ ┌─────────────────────────────────┐ │
│ │ [1:00] [1:30] [2:00*] [2:30]    │ │ ← Chips
│ │ [3:00] [Custom]                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Notes (Optional)                    │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │ ← Text area
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

#### Component Props
```typescript
interface ExerciseConfigModalProps {
  visible: boolean
  exercise: TemplateExercise
  onSave: (config: ExerciseConfig) => void
  onClose: () => void
}

interface ExerciseConfig {
  sets: number
  reps?: number
  weight?: number
  rest_seconds: number
  time_seconds?: number
  distance_m?: number
  notes?: string
}
```

#### Different Configs by Exercise Type
```typescript
// Lifting: sets, reps, weight, rest
<NumberInput label="Sets" value={sets} onChange={setSets} />
<NumberInput label="Reps per Set" value={reps} onChange={setReps} />
<NumberInput label="Weight (lbs)" value={weight} onChange={setWeight} />
<RestSelector value={rest} onChange={setRest} />

// Cardio: time, distance
<NumberInput label="Duration (minutes)" value={time} onChange={setTime} />
<NumberInput label="Distance (miles)" value={distance} onChange={setDistance} />

// Timed: duration, sets, rest
<NumberInput label="Sets" value={sets} onChange={setSets} />
<NumberInput label="Duration per Set (seconds)" value={duration} onChange={setDuration} />
<RestSelector value={rest} onChange={setRest} />

// Bodyweight: sets, reps, rest (no weight)
<NumberInput label="Sets" value={sets} onChange={setSets} />
<NumberInput label="Reps per Set" value={reps} onChange={setReps} />
<RestSelector value={rest} onChange={setRest} />
```

---

### 4. ActiveWorkoutScreen

#### Layout
```
┌─────────────────────────────────────┐
│ ⏸        Strong 5x5 - Workout B     │ ← Header
│           Oct 9, 2025               │
│           ⏱ 0:03:45                 │ ← Timer (large)
├─────────────────────────────────────┤
│                                     │
│ 💪 Squat (Barbell)                  │ ← Exercise header
│ Legs                                │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Set │ Prev │ lbs  │ Reps │ ✓   │ │ ← Table header
│ ├─────┼──────┼──────┼──────┼─────┤ │
│ │  1  │ 225×5│ 225▾ │  5▾  │ ✓  │ │ ← Set row
│ ├─────┼──────┼──────┼──────┼─────┤ │
│ │  2  │ 225×5│ 225  │  5   │ □  │ │
│ ├─────┼──────┼──────┼──────┼─────┤ │
│ │  3  │ 225×5│ 225  │  5   │ □  │ │
│ └─────────────────────────────────┘ │
│ + Add Set                           │
│                                     │
│ 💪 Overhead Press (Barbell)         │
│ Shoulders                           │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Set │ Prev │ lbs  │ Reps │ ✓   │ │
│ ├─────┼──────┼──────┼──────┼─────┤ │
│ │  1  │ 135×5│ 135  │  5   │ □  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ (scrollable content)                │
│                                     │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │         ✓ Finish Workout        │ │ ← Finish button
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### Component Props
```typescript
interface ActiveWorkoutScreenProps {
  session: WorkoutSession
  onFinish: () => Promise<void>
  onCancel: () => void
}

interface WorkoutSession {
  id: string
  name: string
  date: string
  started_at: string
  exercises: SessionExercise[]
}

interface SessionExercise {
  id: string
  name: string
  category: string
  type: 'Lifting' | 'Cardio' | 'METCON' | 'Bodyweight' | 'Timed'
  sets: SessionSet[]
  target_rest_seconds: number
}

interface SessionSet {
  set_index: number
  target_reps?: number
  target_weight?: number
  actual_reps?: number
  actual_weight?: number
  completed: boolean
  previous_reps?: number
  previous_weight?: number
}
```

#### Key Interactions
```typescript
// Set completion
const handleCompleteSet = async (exerciseId: string, setIndex: number) => {
  // Mark set as complete
  await completeSet({
    sessionExerciseId: exerciseId,
    setIndex,
    actuals: {
      reps: actualReps,
      weight: actualWeight,
    },
  })
  
  // Start rest timer
  startRestTimer(exercise.target_rest_seconds)
}

// Finish workout
const handleFinish = async () => {
  const duration = Date.now() - new Date(session.started_at).getTime()
  await endSession(session.id, duration / 1000)
  onFinish()
}
```

---

### 5. RestTimer Component

#### Visual Design
```
┌─────────────────────────────────────┐
│                                     │
│         🧘 Rest Timer               │
│                                     │
│            1:45                     │ ← Large countdown
│                                     │
│    ████████████░░░░░░░              │ ← Progress bar
│                                     │
│      [Skip Rest] [Add 30s]          │ ← Actions
│                                     │
└─────────────────────────────────────┘
```

#### Component Props
```typescript
interface RestTimerProps {
  duration: number // in seconds
  onComplete: () => void
  onSkip: () => void
  onExtend: (seconds: number) => void
}

// Usage
<RestTimer
  duration={120}
  onComplete={() => console.log('Rest complete!')}
  onSkip={() => console.log('Rest skipped')}
  onExtend={(sec) => console.log(`Extended by ${sec}s`)}
/>
```

---

## 🎭 Animations & Interactions

### 1. Modal Transitions
```typescript
// Slide up from bottom
const slideUpAnimation = {
  animationType: 'slide' as const,
  presentationStyle: 'pageSheet' as const,
}

// Fade with scale
const fadeScaleAnimation = {
  entering: FadeIn.duration(200),
  exiting: FadeOut.duration(150),
}
```

### 2. List Item Press
```typescript
// Ripple effect on press
<TouchableOpacity
  activeOpacity={0.7}
  style={[
    styles.exerciseCard,
    isSelected && styles.exerciseCardSelected,
  ]}
>
  {/* Content */}
</TouchableOpacity>
```

### 3. Checkbox Animation
```typescript
// Scale + color change
const checkboxScale = useAnimatedStyle(() => ({
  transform: [{ scale: withSpring(checked ? 1.2 : 1) }],
  backgroundColor: checked ? WorkoutColors.success : 'transparent',
}))
```

### 4. Timer Count Animation
```typescript
// Number changing animation
const timerValue = useSharedValue(duration)

useEffect(() => {
  timerValue.value = withTiming(0, { duration: duration * 1000 })
}, [duration])
```

---

## 📐 Responsive Design

### Breakpoints
```typescript
const Breakpoints = {
  small: 375,   // iPhone SE
  medium: 390,  // iPhone 12/13/14
  large: 428,   // iPhone 14 Pro Max
  tablet: 768,  // iPad Mini
}

// Responsive padding
const getResponsivePadding = (width: number) => {
  if (width >= Breakpoints.tablet) return Spacing.xxl
  if (width >= Breakpoints.large) return Spacing.xl
  return Spacing.lg
}
```

### Safe Areas
```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const WorkoutScreen = () => {
  const insets = useSafeAreaInsets()
  
  return (
    <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Content */}
    </View>
  )
}
```

---

## ♿ Accessibility

### 1. Labels & Hints
```typescript
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Complete set 1"
  accessibilityHint="Tap to mark this set as complete"
  accessibilityRole="checkbox"
  accessibilityState={{ checked: isCompleted }}
>
  {/* Checkbox */}
</TouchableOpacity>
```

### 2. Dynamic Type
```typescript
import { useWindowDimensions, PixelRatio } from 'react-native'

const getFontScale = () => {
  const fontScale = PixelRatio.getFontScale()
  return Math.min(fontScale, 1.3) // Cap at 130%
}
```

### 3. Color Contrast
```typescript
// Ensure WCAG AA compliance (4.5:1 for normal text)
const getContrastColor = (background: string) => {
  // Calculate luminance and return black or white
  return isLight(background) ? '#000000' : '#FFFFFF'
}
```

---

## 🔊 Sound & Haptics

### 1. Rest Timer Complete
```typescript
import * as Haptics from 'expo-haptics'
import { Audio } from 'expo-av'

const playRestCompleteSound = async () => {
  // Haptic feedback
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  
  // Sound (optional)
  const { sound } = await Audio.Sound.createAsync(
    require('../assets/sounds/bell1.mp3')
  )
  await sound.playAsync()
}
```

### 2. Set Completion
```typescript
const playSetCompleteHaptic = async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
}
```

### 3. Button Press
```typescript
const playButtonPress = async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
}
```

---

## 📝 Form Validation

### 1. Template Name
```typescript
const validateTemplateName = (name: string): string | null => {
  if (!name.trim()) return 'Template name is required'
  if (name.length < 3) return 'Name must be at least 3 characters'
  if (name.length > 50) return 'Name must be less than 50 characters'
  return null
}
```

### 2. Exercise Config
```typescript
const validateExerciseConfig = (config: ExerciseConfig): string | null => {
  if (config.sets < 1) return 'Must have at least 1 set'
  if (config.sets > 20) return 'Maximum 20 sets'
  
  if (config.reps !== undefined) {
    if (config.reps < 1) return 'Must have at least 1 rep'
    if (config.reps > 999) return 'Maximum 999 reps'
  }
  
  if (config.weight !== undefined) {
    if (config.weight < 0) return 'Weight cannot be negative'
    if (config.weight > 9999) return 'Maximum weight is 9999 lbs'
  }
  
  return null
}
```

---

## 🎬 Loading States

### 1. Exercise Library Loading
```typescript
<View style={styles.loadingContainer}>
  <ActivityIndicator size="large" color={WorkoutColors.primary} />
  <Text style={styles.loadingText}>Loading exercises...</Text>
</View>
```

### 2. Skeleton Screens
```typescript
// Exercise card skeleton
<View style={[styles.exerciseCard, styles.skeleton]}>
  <View style={[styles.skeletonCircle, styles.shimmer]} />
  <View style={styles.skeletonText}>
    <View style={[styles.skeletonLine, styles.shimmer]} />
    <View style={[styles.skeletonLine, styles.skeletonLineShort, styles.shimmer]} />
  </View>
</View>
```

---

## 📊 Empty States

### 1. No Exercises in Template
```tsx
<View style={styles.emptyState}>
  <Ionicons name="barbell-outline" size={64} color={WorkoutColors.textTertiary} />
  <Text style={styles.emptyTitle}>No exercises yet</Text>
  <Text style={styles.emptySubtitle}>
    Tap "Add Exercises" to get started
  </Text>
</View>
```

### 2. No Assigned Workouts
```tsx
<View style={styles.emptyState}>
  <Ionicons name="calendar-outline" size={64} color={WorkoutColors.textTertiary} />
  <Text style={styles.emptyTitle}>No workouts assigned</Text>
  <Text style={styles.emptySubtitle}>
    Your coach will assign workouts soon
  </Text>
</View>
```

---

**Document Version:** 1.0  
**Last Updated:** October 9, 2025  
**Status:** REFERENCE GUIDE

