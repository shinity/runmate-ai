import os
import math
import httpx
from typing import Optional

REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")
REPLICATE_API_URL = "https://api.replicate.com/v1/predictions"


def pace_to_color(avg_pace_sec: Optional[int]) -> str:
    """Map pace to a color for the art prompt."""
    if avg_pace_sec is None:
        return "golden"
    if avg_pace_sec < 240:   # < 4:00/km — elite
        return "electric blue"
    elif avg_pace_sec < 300: # < 5:00/km — fast
        return "vivid orange"
    elif avg_pace_sec < 360: # < 6:00/km — moderate
        return "warm amber"
    elif avg_pace_sec < 420: # < 7:00/km — easy
        return "soft green"
    else:                    # relaxed
        return "gentle purple"


def normalize_route(datapoints: list[dict]) -> list[tuple[float, float]]:
    """Normalize GPS coordinates to a 0-1 canvas."""
    if not datapoints:
        return []

    lats = [p["lat"] for p in datapoints if p.get("lat") is not None]
    lngs = [p["lng"] for p in datapoints if p.get("lng") is not None]

    if not lats or not lngs:
        return []

    min_lat, max_lat = min(lats), max(lats)
    min_lng, max_lng = min(lngs), max(lngs)

    lat_range = max_lat - min_lat or 1
    lng_range = max_lng - min_lng or 1

    return [
        (
            (p["lng"] - min_lng) / lng_range,
            1 - (p["lat"] - min_lat) / lat_range,  # flip y axis
        )
        for p in datapoints
        if p.get("lat") is not None and p.get("lng") is not None
    ]


def build_art_prompt(
    city: Optional[str],
    weather_condition: Optional[str],
    pace_color: str,
    route_shape: str,
) -> str:
    location_desc = f"through {city}" if city else "through a city"
    weather_desc = weather_condition or "clear"

    return (
        f"An abstract watercolor painting of a running route {location_desc}. "
        f"The route path glows {pace_color}, painted as flowing brushstrokes on textured paper. "
        f"The background suggests a {weather_desc} day with soft washes of color. "
        f"Minimalist, artistic, no text, no people, birds-eye view. "
        f"The route shape is: {route_shape}. "
        f"Style: impressionistic watercolor, high contrast route, muted background."
    )


async def generate_route_art(
    run_id: str,
    datapoints: list[dict],
    city: Optional[str] = None,
    weather_condition: Optional[str] = None,
    avg_pace_sec_per_km: Optional[int] = None,
) -> dict:
    if not REPLICATE_API_TOKEN:
        return {"status": "skipped", "reason": "REPLICATE_API_TOKEN not configured"}

    pace_color = pace_to_color(avg_pace_sec_per_km)

    # Describe route shape from normalized coordinates
    normalized = normalize_route(datapoints)
    if len(normalized) > 10:
        # Sample every Nth point to describe shape
        step = max(1, len(normalized) // 10)
        sampled = normalized[::step]
        shape_desc = f"a path with {len(normalized)} points, roughly {'circular' if _is_circular(normalized) else 'linear'}"
    else:
        shape_desc = "a short running path"

    prompt = build_art_prompt(city, weather_condition, pace_color, shape_desc)

    async with httpx.AsyncClient() as http:
        response = await http.post(
            REPLICATE_API_URL,
            headers={
                "Authorization": f"Token {REPLICATE_API_TOKEN}",
                "Content-Type": "application/json",
            },
            json={
                "version": "7762fd07cf82c948538e41f4b9bfc9bf46c7f516c6f08c3f0f0e4b0b5d7b3c4",  # SDXL
                "input": {
                    "prompt": prompt,
                    "width": 1024,
                    "height": 1024,
                    "num_inference_steps": 30,
                    "guidance_scale": 7.5,
                },
                "webhook": f"{os.getenv('API_BASE_URL', '')}/api/v1/art/webhook",
                "webhook_events_filter": ["completed"],
            },
            timeout=30,
        )

    if response.status_code not in (200, 201):
        return {"status": "error", "reason": response.text}

    prediction = response.json()
    return {
        "status": "queued",
        "predictionId": prediction.get("id"),
        "runId": run_id,
    }


def _is_circular(points: list[tuple[float, float]]) -> bool:
    """Heuristic: route is circular if start and end are close."""
    if len(points) < 5:
        return False
    start, end = points[0], points[-1]
    dist = math.sqrt((start[0] - end[0]) ** 2 + (start[1] - end[1]) ** 2)
    return dist < 0.15
