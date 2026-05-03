import { z } from 'zod'

// ─── Auth ───────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const GoogleAuthSchema = z.object({
  idToken: z.string().min(1),
})

export const AppleAuthSchema = z.object({
  identityToken: z.string().min(1),
  user: z.string().optional(),
  fullName: z.object({ givenName: z.string().nullable().optional(), familyName: z.string().nullable().optional() }).nullable().optional(),
})

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(50),
})

// ─── User ───────────────────────────────────────────────────────────────────

export const UpdateUserSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say']).optional(),
  heightCm: z.number().int().min(100).max(250).optional(),
  weightKg: z.number().min(30).max(300).optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'elite']).optional(),
  primaryGoal: z.enum(['fitness', 'five_k', 'ten_k', 'half_marathon', 'marathon', 'ultra']).optional(),
  weeklyTargetKm: z.number().min(0).max(500).optional(),
  preferredPaceMinSecPerKm: z.number().int().min(120).max(900).optional(),
  preferredPaceMaxSecPerKm: z.number().int().min(120).max(900).optional(),
  city: z.string().max(100).optional(),
  countryCode: z.string().length(2).optional(),
  timezone: z.string().optional(),
  matchingEnabled: z.boolean().optional(),
  preferGroupRuns: z.boolean().optional(),
  maxMatchDistanceKm: z.number().min(0).max(100).optional(),
  onboardingCompleted: z.boolean().optional(),
})

// ─── Run ────────────────────────────────────────────────────────────────────

export const RunDatapointSchema = z.object({
  timestamp: z.string().datetime(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  altitudeM: z.number().nullable().optional(),
  heartRate: z.number().int().min(30).max(250).nullable().optional(),
  cadenceSpm: z.number().int().min(0).max(300).nullable().optional(),
  paceSecPerKm: z.number().min(0).nullable().optional(),
  powerWatts: z.number().min(0).nullable().optional(),
})

export const RunSplitSchema = z.object({
  splitNumber: z.number().int().positive(),
  splitType: z.enum(['km', 'mile']),
  durationSeconds: z.number().int().positive(),
  paceSecPerKm: z.number().positive(),
  heartRate: z.number().int().min(30).max(250).nullable().optional(),
})

export const CreateRunSchema = z.object({
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  durationSeconds: z.number().int().positive(),
  distanceMeters: z.number().positive(),
  elevationGainMeters: z.number().min(0).default(0),
  elevationLossMeters: z.number().min(0).default(0),
  avgPaceSecPerKm: z.number().positive(),
  bestPaceSecPerKm: z.number().positive().optional(),
  avgHeartRate: z.number().int().min(30).max(250).nullable().optional(),
  maxHeartRate: z.number().int().min(30).max(250).nullable().optional(),
  avgCadenceSpm: z.number().int().min(0).max(300).nullable().optional(),
  avgPowerWatts: z.number().min(0).nullable().optional(),
  surfaceType: z.enum(['road', 'trail', 'track', 'treadmill', 'mixed']).optional(),
  weatherTempC: z.number().min(-50).max(60).nullable().optional(),
  weatherHumidity: z.number().min(0).max(100).nullable().optional(),
  weatherCondition: z.string().max(50).nullable().optional(),
  dataSource: z.enum(['apple_health', 'health_connect', 'garmin_connect', 'manual', 'app_native']),
  title: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  effortScore: z.number().int().min(1).max(10).default(5),
  isPublic: z.boolean().default(false),
  datapoints: z.array(RunDatapointSchema).optional(),
  splits: z.array(RunSplitSchema).optional(),
})

export const PaginationSchema = z.object({
  after: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const AnimateRunSchema = z.object({
  backgroundPreset: z.enum(['city_night', 'park', 'beach', 'mountain', 'space', 'sunset']),
  characterPreset: z.enum(['runner', 'ninja', 'robot', 'cat', 'unicorn', 'astronaut']),
  speed: z.number().min(0.5).max(3.0).default(1.0),
})

// ─── Coaching ───────────────────────────────────────────────────────────────

export const GeneratePlanSchema = z.object({
  goal: z.string().min(5).max(200),
  targetDate: z.string().datetime(),
  availableDaysPerWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  currentFitnessLevel: z.enum(['low', 'moderate', 'high']).optional(),
})

// ─── Matching ───────────────────────────────────────────────────────────────

export const UpdateMatchProfileSchema = z.object({
  runningStyle: z.enum(['social', 'competitive', 'meditative', 'mixed']).optional(),
  communicationPref: z.enum(['chatty', 'quiet', 'results_only']).optional(),
  lookingFor: z.enum(['solo_accountability', 'running_partner', 'group', 'any']).optional(),
  maxPaceDifferenceSecPerKm: z.number().int().min(0).max(300).optional(),
  preferVirtualOnly: z.boolean().optional(),
  isLocationPublic: z.boolean().optional(),
})

export const CreateGroupSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(500),
  maxMembers: z.number().int().min(2).max(100).default(20),
  isPublic: z.boolean().default(true),
  tags: z.array(z.string().max(30)).max(10).default([]),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type GoogleAuthInput = z.infer<typeof GoogleAuthSchema>
export type AppleAuthInput = z.infer<typeof AppleAuthSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
export type CreateRunInput = z.infer<typeof CreateRunSchema>
export type GeneratePlanInput = z.infer<typeof GeneratePlanSchema>
export type UpdateMatchProfileInput = z.infer<typeof UpdateMatchProfileSchema>
export type CreateGroupInput = z.infer<typeof CreateGroupSchema>
export type PaginationInput = z.infer<typeof PaginationSchema>
export type AnimateRunInput = z.infer<typeof AnimateRunSchema>
