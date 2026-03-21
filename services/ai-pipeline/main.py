from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv

from coaches.post_run_coach import analyze_run
from matching.embeddings import update_runner_embedding, find_similar_runners
from art.route_art import generate_route_art

load_dotenv()

app = FastAPI(title="RunMate AI Pipeline", version="1.0.0")

PIPELINE_SECRET = os.getenv("AI_PIPELINE_SECRET", "dev-secret")


def verify_secret(x_pipeline_secret: str = Header(...)):
    if x_pipeline_secret != PIPELINE_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ─── Health ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


# ─── Run Analysis ──────────────────────────────────────────────────────────

class RunAnalysisRequest(BaseModel):
    run_id: str
    user_id: str
    run_data: dict
    user_profile: dict
    historical_runs: list[dict]
    active_plan: Optional[dict] = None


@app.post("/analyze-run")
async def analyze_run_endpoint(body: RunAnalysisRequest, secret: str = Header(alias="x-pipeline-secret")):
    if secret != PIPELINE_SECRET:
        raise HTTPException(status_code=401)

    result = await analyze_run(
        run_data=body.run_data,
        user_profile=body.user_profile,
        historical_runs=body.historical_runs,
        active_plan=body.active_plan,
    )
    return {"data": result}


# ─── Embeddings / Matching ─────────────────────────────────────────────────

class EmbeddingUpdateRequest(BaseModel):
    user_id: str
    profile: dict


@app.post("/embeddings/update")
async def update_embedding(body: EmbeddingUpdateRequest, secret: str = Header(alias="x-pipeline-secret")):
    if secret != PIPELINE_SECRET:
        raise HTTPException(status_code=401)

    await update_runner_embedding(user_id=body.user_id, profile=body.profile)
    return {"data": {"status": "updated"}}


class SimilarRunnersRequest(BaseModel):
    user_id: str
    top_k: int = 20
    pace_tolerance_sec: int = 60


@app.post("/embeddings/similar")
async def find_similar(body: SimilarRunnersRequest, secret: str = Header(alias="x-pipeline-secret")):
    if secret != PIPELINE_SECRET:
        raise HTTPException(status_code=401)

    results = await find_similar_runners(
        user_id=body.user_id,
        top_k=body.top_k,
    )
    return {"data": results}


# ─── Route Art ─────────────────────────────────────────────────────────────

class RouteArtRequest(BaseModel):
    run_id: str
    user_id: str
    datapoints: list[dict]  # [{lat, lng, pace_sec_per_km}]
    city: Optional[str] = None
    weather_condition: Optional[str] = None
    avg_pace_sec_per_km: Optional[int] = None


@app.post("/art/generate")
async def generate_art(body: RouteArtRequest, secret: str = Header(alias="x-pipeline-secret")):
    if secret != PIPELINE_SECRET:
        raise HTTPException(status_code=401)

    result = await generate_route_art(
        run_id=body.run_id,
        datapoints=body.datapoints,
        city=body.city,
        weather_condition=body.weather_condition,
        avg_pace_sec_per_km=body.avg_pace_sec_per_km,
    )
    return {"data": result}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
