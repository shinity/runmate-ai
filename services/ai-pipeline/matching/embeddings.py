import os
from openai import AsyncOpenAI
from pinecone import Pinecone

openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

_pinecone: Pinecone | None = None
_index = None

def get_pinecone_index():
    global _pinecone, _index
    if _index is None:
        _pinecone = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        _index = _pinecone.Index("runmate-runners")
    return _index


def build_profile_text(profile: dict) -> str:
    """Convert runner profile to a descriptive text for embedding."""
    pace_sec = profile.get("avgPaceSecPerKm", 360)
    pace_min = pace_sec // 60
    pace_s = pace_sec % 60

    lines = [
        f"Runner profile:",
        f"Runs {profile.get('avgWeeklyKm', 0):.0f}km per week",
        f"Average pace {pace_min}:{str(pace_s).zfill(2)} per km",
        f"Experience level: {profile.get('experienceLevel', 'intermediate')}",
        f"Goal: {profile.get('primaryGoal', 'fitness')}",
        f"Preferred run time: {profile.get('preferredRunTime', 'morning')}",
        f"Running style: {profile.get('runningStyle', 'mixed')}",
        f"Consistency score: {profile.get('consistencyScore', 50):.0f}/100",
        f"Preferred distance: {profile.get('preferredDistanceKm', 5):.0f}km",
        f"Looking for: {profile.get('lookingFor', 'any')}",
    ]

    if profile.get("city"):
        lines.append(f"Location: {profile['city']}")

    return "\n".join(lines)


async def update_runner_embedding(user_id: str, profile: dict) -> None:
    """Generate embedding and upsert to Pinecone."""
    text = build_profile_text(profile)

    response = await openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    embedding = response.data[0].embedding

    index = get_pinecone_index()
    index.upsert(
        vectors=[{
            "id": user_id,
            "values": embedding,
            "metadata": {
                "avgPaceSecPerKm": profile.get("avgPaceSecPerKm", 360),
                "avgWeeklyKm": profile.get("avgWeeklyKm", 0),
                "experienceLevel": profile.get("experienceLevel", "intermediate"),
                "city": profile.get("city", ""),
                "runningStyle": profile.get("runningStyle", "mixed"),
                "lookingFor": profile.get("lookingFor", "any"),
            },
        }],
        namespace="runners",
    )


async def find_similar_runners(user_id: str, top_k: int = 20) -> list[dict]:
    """Find similar runners using vector similarity."""
    index = get_pinecone_index()

    # Fetch user's own vector
    result = index.fetch(ids=[user_id], namespace="runners")
    if user_id not in result.vectors:
        return []

    user_vector = result.vectors[user_id].values

    # Query similar runners (exclude self)
    query_result = index.query(
        vector=user_vector,
        top_k=top_k + 1,
        namespace="runners",
        include_metadata=True,
    )

    return [
        {
            "userId": match.id,
            "similarityScore": round(match.score, 4),
            "metadata": match.metadata,
        }
        for match in query_result.matches
        if match.id != user_id
    ][:top_k]
