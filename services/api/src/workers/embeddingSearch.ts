const AI_PIPELINE_URL = process.env.AI_PIPELINE_URL ?? 'http://localhost:8000'
const AI_PIPELINE_SECRET = process.env.AI_PIPELINE_SECRET ?? 'dev-secret'

export interface SimilarRunner {
  userId: string
  similarityScore: number
  metadata: Record<string, unknown>
}

/**
 * AI Pipeline을 통해 Pinecone에서 유사 러너를 검색한다.
 * 실패 시 null을 반환하여 호출 측에서 DB 폴백 처리를 할 수 있도록 한다.
 */
export async function findSimilarRunnersFromPinecone(
  userId: string,
  topK: number = 20,
): Promise<SimilarRunner[] | null> {
  if (!process.env.AI_PIPELINE_URL) {
    // AI Pipeline URL이 설정되지 않은 경우 Pinecone 미사용으로 처리
    return null
  }

  try {
    const response = await fetch(`${AI_PIPELINE_URL}/embeddings/similar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pipeline-secret': AI_PIPELINE_SECRET,
      },
      body: JSON.stringify({ user_id: userId, top_k: topK }),
    })

    if (!response.ok) {
      const body = await response.text()
      console.error(`[EmbeddingSearch] AI Pipeline error: ${response.status} ${body}`)
      return null
    }

    const result = (await response.json()) as { data: SimilarRunner[] }
    return result.data
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[EmbeddingSearch] Failed to query Pinecone: ${message}`)
    return null
  }
}
