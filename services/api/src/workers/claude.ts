import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

  const recentWeekLoad = historicalRuns
    .filter((r) => true) // last 7 days filter would need timestamps
    .reduce((s, r) => s + r.trainingLoad, 0)

  const systemPrompt = `You are an expert running coach. Analyze the runner's data and provide a concise, personalized coaching insight.

Always respond with valid JSON matching this exact schema:
{
  "type": one of ["recovery_advice", "performance_analysis", "habit_pattern", "injury_risk_alert", "motivation", "plan_adjustment"],
  "content": "2-4 sentences of coaching insight, conversational and encouraging",
  "priority": one of ["low", "medium", "high", "urgent"],
  "metrics": { key-value pairs of relevant numbers },
  "actionItems": ["actionable tip 1", "actionable tip 2"] (1-3 items max)
}

Runner profile:
- Experience: ${user.experienceLevel}
- Primary goal: ${user.primaryGoal}
- Weekly target: ${user.weeklyTargetKm}km
${activePlan ? `- Active plan: "${activePlan.title}" - ${activePlan.goal}` : '- No active training plan'}
- Recent training load (last 30 runs avg): ${historicalRuns.length > 0 ? Math.round(historicalRuns.reduce((s, r) => s + r.trainingLoad, 0) / historicalRuns.length) : 0}`

  const userMessage = `Just completed a run:
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

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 512,
    temperature: 0.4,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    // Extract JSON from response (handles markdown code blocks too)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')
    return JSON.parse(jsonMatch[0]) as CoachingInsightOutput
  } catch {
    // Fallback insight if parsing fails
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

  const systemPrompt = `You are an expert running coach specializing in evidence-based training plans.
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
Plan length: ${weeksUntilGoal} weeks (max 20)`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    temperature: 0.3,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Create a training plan:
Goal: ${goal}
Target date: ${targetDate} (${weeksUntilGoal} weeks away)
Experience level: ${user.experienceLevel}
Current fitness: ${currentFitnessLevel}
Available days: ${availableDays.join(', ')} (0=Sun through 6=Sat)
Current weekly km: ${user.weeklyTargetKm}km
Recent training: ${recentRunsSummary}`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  return jsonMatch ? JSON.parse(jsonMatch[0]) : {}
}
