import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

interface RunAnalysisInput {
  run: {
    distanceMeters: number
    durationSeconds: number
    avgPaceSecPerKm: number
    bestPaceSecPerKm?: number | null
    avgHeartRate?: number | null
    maxHeartRate?: number | null
    avgCadenceSpm?: number | null
    trainingLoad: number
    effortScore: number
    surfaceType?: string | null
    weatherTempC?: number | null
  }
  user: {
    experienceLevel: string
    primaryGoal: string
    weeklyTargetKm: number
  }
  historicalRuns: Array<{
    distanceMeters: number
    durationSeconds: number
    avgPaceSecPerKm: number
    trainingLoad: number
  }>
  activePlan: { title: string; goal: string } | null
}

interface CoachingInsightOutput {
  type: string
  content: string
  priority: string
  metrics: Record<string, number | string>
  actionItems: string[]
}

export async function analyzeRunWithClaude(input: RunAnalysisInput): Promise<CoachingInsightOutput> {
  const { run, user, historicalRuns, activePlan } = input

  const distKm = (run.distanceMeters / 1000).toFixed(2)
  const paceMin = Math.floor(run.avgPaceSecPerKm / 60)
  const paceSec = run.avgPaceSecPerKm % 60
  const durationMin = Math.round(run.durationSeconds / 60)

  const recentWeekLoad = historicalRuns.reduce((s, r) => s + r.trainingLoad, 0)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          type: {
            type: SchemaType.STRING,
            format: 'enum',
            enum: ['recovery_advice', 'performance_analysis', 'habit_pattern', 'injury_risk_alert', 'motivation', 'plan_adjustment'],
          },
          content: { type: SchemaType.STRING },
          priority: {
            type: SchemaType.STRING,
            format: 'enum',
            enum: ['low', 'medium', 'high', 'urgent'],
          },
          metrics: {
            type: SchemaType.OBJECT,
            properties: {},
          },
          actionItems: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ['type', 'content', 'priority', 'metrics', 'actionItems'],
      },
      temperature: 0.4,
      maxOutputTokens: 512,
    },
    systemInstruction: `You are an expert running coach. Analyze the runner's data and provide a concise, personalized coaching insight.

Runner profile:
- Experience: ${user.experienceLevel}
- Primary goal: ${user.primaryGoal}
- Weekly target: ${user.weeklyTargetKm}km
${activePlan ? `- Active plan: "${activePlan.title}" - ${activePlan.goal}` : '- No active training plan'}
- Recent training load (last 30 runs avg): ${historicalRuns.length > 0 ? Math.round(historicalRuns.reduce((s, r) => s + r.trainingLoad, 0) / historicalRuns.length) : 0}`,
  })

  const prompt = `Just completed a run:
- Distance: ${distKm}km
- Duration: ${durationMin} min
- Avg pace: ${paceMin}:${String(paceSec).padStart(2, '0')}/km
- Effort score: ${run.effortScore}/10
- Training load: ${run.trainingLoad}
${run.avgHeartRate ? `- Avg HR: ${run.avgHeartRate} bpm` : ''}
${run.avgCadenceSpm ? `- Avg cadence: ${run.avgCadenceSpm} spm` : ''}
${run.surfaceType ? `- Surface: ${run.surfaceType}` : ''}
${run.weatherTempC !== null && run.weatherTempC !== undefined ? `- Temperature: ${run.weatherTempC}°C` : ''}

Recent training context:
- Total runs in history: ${historicalRuns.length}
- Cumulative recent load: ${recentWeekLoad}

Provide a coaching insight for this run.`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    return JSON.parse(text) as CoachingInsightOutput
  } catch {
    return {
      type: 'performance_analysis',
      content: `Great run! You covered ${distKm}km at ${paceMin}:${String(paceSec).padStart(2, '0')}/km pace. Keep up the consistent training.`,
      priority: 'low',
      metrics: { distanceKm: parseFloat(distKm), paceSecPerKm: run.avgPaceSecPerKm },
      actionItems: ['Stay hydrated', 'Get good sleep tonight'],
    }
  }
}

export async function generateTrainingPlanWithClaude(input: {
  user: { experienceLevel: string; primaryGoal: string; weeklyTargetKm: number }
  goal: string
  targetDate: string
  availableDays: number[]
  currentFitnessLevel: string
  recentRunsSummary: string
}): Promise<object> {
  const { user, goal, targetDate, availableDays, currentFitnessLevel, recentRunsSummary } = input

  const weeksUntilGoal = Math.floor(
    (new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7),
  )

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
      maxOutputTokens: 4096,
    },
    systemInstruction: `You are an expert running coach specializing in evidence-based training plans.
Generate a structured training plan as JSON. Respond ONLY with valid JSON.

Schema:
{
  "title": "Plan title",
  "description": "1-2 sentence plan overview",
  "weeks": [
    {
      "weekNumber": 1,
      "targetDistanceKm": 30,
      "targetSessions": 4,
      "theme": "Base Building",
      "sessions": [
        {
          "dayOfWeek": 1,
          "sessionType": "easy",
          "targetDistanceKm": 6,
          "targetDurationMin": null,
          "targetPaceMinSecPerKm": 330,
          "targetPaceMaxSecPerKm": 390,
          "description": "Easy recovery run at conversational pace"
        }
      ]
    }
  ]
}

sessionType options: easy, tempo, interval, long_run, recovery, cross_train, rest
dayOfWeek: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
Only schedule sessions on days: ${availableDays.join(', ')}
Plan length: ${weeksUntilGoal} weeks (max 20)`,
  })

  const prompt = `Create a training plan:
Goal: ${goal}
Target date: ${targetDate} (${weeksUntilGoal} weeks away)
Experience level: ${user.experienceLevel}
Current fitness: ${currentFitnessLevel}
Available days: ${availableDays.join(', ')} (0=Sun through 6=Sat)
Current weekly km: ${user.weeklyTargetKm}km
Recent training: ${recentRunsSummary}`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {}
  } catch {
    return {}
  }
}
