import json
import re
from typing import Optional
import anthropic

client = anthropic.Anthropic()

SYSTEM_PROMPT = """You are an expert running coach. Analyze the runner's data and provide a concise, personalized coaching insight.

Always respond with valid JSON matching this exact schema:
{
  "type": one of ["recovery_advice", "performance_analysis", "habit_pattern", "injury_risk_alert", "motivation", "plan_adjustment"],
  "content": "2-4 sentences of coaching insight, conversational and encouraging",
  "priority": one of ["low", "medium", "high", "urgent"],
  "metrics": { key-value pairs of relevant numbers },
  "actionItems": ["actionable tip 1", "actionable tip 2"]
}

Focus on what is most useful to the runner right now. If injury risk is detected, elevate priority to urgent."""


async def analyze_run(
    run_data: dict,
    user_profile: dict,
    historical_runs: list[dict],
    active_plan: Optional[dict] = None,
) -> dict:
    dist_km = run_data.get("distanceMeters", 0) / 1000
    pace_sec = run_data.get("avgPaceSecPerKm", 360)
    pace_min = pace_sec // 60
    pace_s = pace_sec % 60
    duration_min = run_data.get("durationSeconds", 0) // 60
    training_load = run_data.get("trainingLoad", 0)

    # Compute recent load trend
    recent_loads = [r.get("trainingLoad", 0) for r in historical_runs[:7]]
    avg_recent_load = sum(recent_loads) / len(recent_loads) if recent_loads else 0
    load_spike = training_load > avg_recent_load * 1.3 if avg_recent_load > 0 else False

    context_lines = [
        f"Runner profile:",
        f"- Experience: {user_profile.get('experienceLevel', 'unknown')}",
        f"- Goal: {user_profile.get('primaryGoal', 'fitness')}",
        f"- Weekly target: {user_profile.get('weeklyTargetKm', 0)}km",
    ]
    if active_plan:
        context_lines.append(f"- Active plan: {active_plan.get('title')} — {active_plan.get('goal')}")
    if load_spike:
        context_lines.append("⚠️ Training load spike detected (>30% above recent average)")

    context = "\n".join(context_lines)

    user_message = f"""{context}

Just completed a run:
- Distance: {dist_km:.2f}km
- Duration: {duration_min} min
- Avg pace: {pace_min}:{str(pace_s).zfill(2)}/km
- Effort: {run_data.get('effortScore', 5)}/10
- Training load: {training_load}
{f"- Avg HR: {run_data['avgHeartRate']} bpm" if run_data.get('avgHeartRate') else ""}
{f"- Cadence: {run_data['avgCadenceSpm']} spm" if run_data.get('avgCadenceSpm') else ""}
{f"- Surface: {run_data['surfaceType']}" if run_data.get('surfaceType') else ""}
{f"- Temp: {run_data['weatherTempC']}°C" if run_data.get('weatherTempC') is not None else ""}

Historical context: {len(historical_runs)} runs analyzed, avg recent load: {avg_recent_load:.0f}

Provide a coaching insight for this run."""

    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=512,
        temperature=0.4,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    text = response.content[0].text if response.content else ""

    try:
        json_match = re.search(r"\{[\s\S]*\}", text)
        if not json_match:
            raise ValueError("No JSON in response")
        return json.loads(json_match.group())
    except Exception:
        return {
            "type": "performance_analysis",
            "content": f"Great run! You covered {dist_km:.1f}km at {pace_min}:{str(pace_s).zfill(2)}/km. Keep building on this momentum.",
            "priority": "low",
            "metrics": {"distanceKm": round(dist_km, 2), "paceSecPerKm": pace_sec},
            "actionItems": ["Stay hydrated", "Get good sleep tonight"],
        }
